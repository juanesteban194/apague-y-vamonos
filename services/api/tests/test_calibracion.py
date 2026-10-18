"""Calibrar los vatios de un enchufe contra un medidor de referencia (ejemplo real: el enchufe leía 48 W y el cabezote marcaba 44 W)."""
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import insert, select

from app.core.config import get_settings
from app.core.database import get_sessionmaker
from app.modules.dispositivos import calibracion
from app.modules.dispositivos.models import Dispositivo
from app.modules.ingesta.models import Lectura

from .conftest import registrar_y_entrar
from .test_enchufe_compartido import cuenta
from .test_ingesta import enviar

TUYA = "eb182b7a119cf6aaeecf66"


def poner(enchufe_id, vatios, n=10, hasta=None, paso=5, encendido=True):
    """n lecturas de `vatios` W (guardadas tal cual), la última en `hasta`."""
    hasta = hasta or datetime.now(UTC)
    filas = [
        {"dispositivo_id": uuid.UUID(enchufe_id), "fecha_hora": hasta - timedelta(seconds=paso * i), "potencia_w": v, "voltaje_v": 120.0, "corriente_ma": 400, "encendido": encendido}
        for i, v in enumerate(vatios if isinstance(vatios, list) else [vatios] * n)
    ]
    with get_sessionmaker()() as db:
        db.execute(insert(Lectura), filas)
        db.commit()


def calibrar(client, auth, hogar, enchufe, ref):
    return client.post(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}/calibrar", json={"referencia_w": ref}, headers=auth)


def dispositivo(enchufe_id):
    with get_sessionmaker()() as db:
        d = db.get(Dispositivo, uuid.UUID(enchufe_id))
        db.expunge(d)
        return d


def potencias(enchufe_id):
    with get_sessionmaker()() as db:
        return [l.potencia_w for l in db.scalars(select(Lectura).where(Lectura.dispositivo_id == uuid.UUID(enchufe_id)).order_by(Lectura.fecha_hora))]


def lect(vatios, segundos=0):
    return {"tuya_id": TUYA, "fecha_hora": (datetime.now(UTC) - timedelta(seconds=segundos)).isoformat(), "potencia_w": vatios, "voltaje_v": 120.0, "corriente_ma": 400, "encendido": True}


# --- el caso real: 48 W contra 44 W ---------------------------------------------------------------------------------------------------
def test_el_enchufe_lee_48_w_y_el_medidor_marca_44_w(client, auth, hogar, enchufe):
    poner(enchufe["id"], 48.0)
    r = calibrar(client, auth, hogar, enchufe, 44)
    assert r.status_code == 200
    assert r.json() == {"factor_calibracion": 0.9167, "referencia_w": 44.0, "lectura_antes_w": 48.0, "lectura_despues_w": 44.0}
    d = dispositivo(enchufe["id"])
    assert d.factor_calibracion == pytest.approx(44 / 48) and d.calibracion_referencia_w == 44.0 and d.calibrado_en is not None


def test_las_lecturas_nuevas_ya_se_guardan_corregidas(client, auth, hogar, enchufe, agente_token):
    poner(enchufe["id"], 48.0, hasta=datetime.now(UTC) - timedelta(seconds=30))  # las de antes de calibrar, claramente anteriores
    calibrar(client, auth, hogar, enchufe, 44)
    assert enviar(client, agente_token, [lect(48.0, 10), lect(48.0, 5), lect(48.0, 0)]).json()["guardadas"] == 3
    assert potencias(enchufe["id"])[-3:] == [pytest.approx(44.0)] * 3  # lo que el enchufe manda es 48; se guarda 44


def test_el_costo_usa_los_vatios_corregidos(client, auth, hogar, enchufe, agente_token):
    from .test_alertas import tarifa_de_octubre

    tarifa_de_octubre()
    poner(enchufe["id"], 48.0)
    calibrar(client, auth, hogar, enchufe, 44)
    desde = datetime.now(UTC) - timedelta(minutes=10)
    r = enviar(client, agente_token, [{**lect(48.0), "fecha_hora": (desde + timedelta(seconds=30 * i)).isoformat()} for i in range(21)])
    assert r.json()["guardadas"] == 21
    # 10 minutos a 44 W en lugar de 48 W: la energía baja en la misma proporción
    from app.modules.consumo.energia import energia_hibrida

    with get_sessionmaker()() as db:
        kwh = sum(energia_hibrida(db, [uuid.UUID(enchufe["id"])], desde - timedelta(minutes=1), datetime.now(UTC) + timedelta(minutes=1), "day").values())
    assert kwh == pytest.approx(44 * 600 / 3.6e6, rel=0.02) and kwh < 48 * 600 / 3.6e6


def test_la_lista_de_enchufes_trae_la_calibracion(client, auth, hogar, enchufe):
    sin = client.get(f"/hogares/{hogar['id']}/dispositivos", headers=auth).json()[0]
    assert (sin["factor_calibracion"], sin["calibracion_referencia_w"]) == (1.0, None)
    poner(enchufe["id"], 48.0)
    calibrar(client, auth, hogar, enchufe, 44)
    con = client.get(f"/hogares/{hogar['id']}/dispositivos", headers=auth).json()[0]
    assert con["factor_calibracion"] == pytest.approx(0.9167, abs=1e-4) and con["calibracion_referencia_w"] == 44.0


# --- cuando no se puede calibrar --------------------------------------------------------------------------------------------------------
def test_sin_lecturas_recientes_pide_esperar(client, auth, hogar, enchufe):
    r = calibrar(client, auth, hogar, enchufe, 44)
    assert r.status_code == 409 and "suficientes lecturas recientes" in r.json()["detail"]


def test_con_lecturas_viejas_tampoco(client, auth, hogar, enchufe):
    poner(enchufe["id"], 48.0, hasta=datetime.now(UTC) - timedelta(minutes=10))
    assert calibrar(client, auth, hogar, enchufe, 44).status_code == 409


def test_un_dispositivo_apagado_no_cuenta(client, auth, hogar, enchufe):
    poner(enchufe["id"], 0.0, encendido=False)
    assert calibrar(client, auth, hogar, enchufe, 44).status_code == 409


def test_con_muy_poca_carga_no_calibra(client, auth, hogar, enchufe):
    poner(enchufe["id"], 2.0)
    r = calibrar(client, auth, hogar, enchufe, 1.5)
    assert r.status_code == 422 and "bombillo de 40 W" in r.json()["detail"]


def test_si_la_lectura_oscila_mucho_pide_esperar(client, auth, hogar, enchufe):
    poner(enchufe["id"], [30.0, 70.0, 30.0, 70.0, 30.0, 70.0])
    r = calibrar(client, auth, hogar, enchufe, 50)
    assert r.status_code == 409 and "variando mucho" in r.json()["detail"]


def test_una_diferencia_de_mas_de_50_por_ciento_se_rechaza_por_medidor_mal_puesto(client, auth, hogar, enchufe):
    poner(enchufe["id"], 48.0)
    r = calibrar(client, auth, hogar, enchufe, 15)
    assert r.status_code == 422 and "más del 50 %" in r.json()["detail"]
    assert dispositivo(enchufe["id"]).factor_calibracion == 1.0  # no cambió nada


@pytest.mark.parametrize("malo", [0, -5, 5000])
def test_la_referencia_debe_ser_razonable(client, auth, hogar, enchufe, malo):
    poner(enchufe["id"], 48.0)
    assert calibrar(client, auth, hogar, enchufe, malo).status_code == 422


# --- recalibrar y quitar -----------------------------------------------------------------------------------------------------------------------
def test_recalibrar_parte_de_la_lectura_cruda_y_no_acumula_ajustes(client, auth, hogar, enchufe):
    ahora = datetime.now(UTC)
    poner(enchufe["id"], 48.0, hasta=ahora - timedelta(seconds=40))
    with get_sessionmaker()() as db:
        d = db.get(Dispositivo, uuid.UUID(enchufe["id"]))
        calibracion.calibrar(db, d, 44, ahora=ahora - timedelta(seconds=30))  # factor 0,9167
    poner(enchufe["id"], 44.0, n=8, hasta=ahora)  # lecturas guardadas ya corregidas, posteriores a la calibración
    with get_sessionmaker()() as db:
        d = db.get(Dispositivo, uuid.UUID(enchufe["id"]))
        r = calibracion.calibrar(db, d, 46, ahora=ahora + timedelta(seconds=1))
    assert r.lectura_antes_w == pytest.approx(44.0) and r.factor_calibracion == pytest.approx(46 / 48, abs=1e-4)  # 46/48, no 46/44


def test_no_mezcla_lecturas_guardadas_con_un_factor_anterior(client, auth, hogar, enchufe):
    """Después de calibrar, las lecturas viejas (sin ajustar) no sirven para volver a calibrar: hay que esperar lecturas nuevas."""
    poner(enchufe["id"], 48.0)
    assert calibrar(client, auth, hogar, enchufe, 44).status_code == 200
    assert calibrar(client, auth, hogar, enchufe, 44).status_code == 409


def test_quitar_la_calibracion_vuelve_al_factor_1(client, auth, hogar, enchufe):
    poner(enchufe["id"], 48.0)
    calibrar(client, auth, hogar, enchufe, 44)
    assert client.delete(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}/calibracion", headers=auth).status_code == 204
    d = dispositivo(enchufe["id"])
    assert (d.factor_calibracion, d.calibracion_referencia_w) == (1.0, None)


def test_tras_quitarla_las_lecturas_nuevas_vuelven_a_guardarse_sin_ajuste(client, auth, hogar, enchufe, agente_token):
    poner(enchufe["id"], 48.0, hasta=datetime.now(UTC) - timedelta(seconds=30))
    calibrar(client, auth, hogar, enchufe, 44)
    client.delete(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}/calibracion", headers=auth)
    enviar(client, agente_token, [lect(48.0)])
    assert potencias(enchufe["id"])[-1] == pytest.approx(48.0)


# --- permisos --------------------------------------------------------------------------------------------------------------------------------------------
def test_otra_cuenta_no_puede_calibrar_tu_enchufe(client, auth, hogar, enchufe):
    poner(enchufe["id"], 48.0)
    otro = registrar_y_entrar(client, "otro@example.com")
    assert calibrar(client, otro, hogar, enchufe, 44).status_code == 403
    assert client.delete(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}/calibracion", headers=otro).status_code == 403
    assert dispositivo(enchufe["id"]).factor_calibracion == 1.0


def test_sin_sesion_no_calibra(client, hogar, enchufe):
    r = client.post(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}/calibrar", json={"referencia_w": 44})
    assert r.status_code in (401, 403)


def test_un_enchufe_de_otra_casa_da_404(client, auth, hogar, enchufe):
    otra = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=auth).json()
    r = client.post(f"/hogares/{otra['id']}/dispositivos/{enchufe['id']}/calibrar", json={"referencia_w": 44}, headers=auth)
    assert r.status_code == 404


# --- el modo de pruebas con varias cuentas ----------------------------------------------------------------------------------------------------------
def test_cada_cuenta_aplica_su_propia_calibracion_a_la_misma_lectura(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "compartir_enchufes", True)
    auth_a, casa_a, a, token_a = cuenta(client, "ana@example.com")
    auth_b, casa_b, b, _ = cuenta(client, "beto@example.com")
    poner(a["id"], 48.0, hasta=datetime.now(UTC) - timedelta(seconds=30))
    calibrar(client, auth_a, casa_a, a, 44)  # Ana calibra; Beto no
    enviar(client, token_a, [lect(48.0)])
    assert potencias(a["id"])[-1] == pytest.approx(44.0)  # Ana: corregida
    assert potencias(b["id"])[-1] == pytest.approx(48.0)  # Beto: cruda, como la lee el enchufe
