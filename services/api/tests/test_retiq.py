import uuid
from datetime import UTC, date, datetime

import pytest
from pytest import approx

from app.core.database import get_sessionmaker
from app.modules.hogares.models import Hogar
from app.modules.retiq import service
from app.modules.retiq.schemas import SimuladorIn
from app.modules.tarifas.models import Tarifa

from .conftest import registrar_y_entrar

AHORA = datetime(2026, 10, 13, 15, 0, 0, tzinfo=UTC)


def datos(hogar_id, actual=70.0, nuevo=30.0, precio=1_200_000.0, tasa=0.12, anios=10):
    return SimuladorIn(hogar_id=uuid.UUID(hogar_id), consumo_actual_kwh_mes=actual, consumo_nuevo_kwh_mes=nuevo, precio_nuevo_cop=precio, tasa_anual=tasa, anios=anios)


def tarifa():
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=3, mes=date(2026, 10, 1), cop_kwh_subsistencia="814.63", cop_kwh_sobre_subsistencia="958.38", fuente="prueba"))
        db.commit()


def simular(hogar, **kw):
    with get_sessionmaker()() as db:
        return service.simular(db, db.get(Hogar, uuid.UUID(hogar["id"])), datos(hogar["id"], **kw), AHORA)


def vpn_a_mano(precio, ahorro, tasa, anios):
    """Suma mes a mes, sin la fórmula cerrada: así se comprueba la fórmula del servicio."""
    i = (1 + tasa) ** (1 / 12) - 1
    return -precio + sum(ahorro / (1 + i) ** m for m in range(1, anios * 12 + 1))


def test_el_vpn_reproduce_el_calculo_hecho_a_mano(client, auth, hogar):
    tarifa()
    r = simular(hogar)
    ahorro = 40 * 814.63  # 70 − 30 kWh al mes a la tarifa subsidiada (el hogar no ha pasado la subsistencia)
    assert r.ahorro_kwh_mes == 40 and r.ahorro_cop_mes == approx(ahorro, abs=0.01) and r.precio_kwh_usado == 814.63
    assert r.vpn_cop == approx(vpn_a_mano(1_200_000, ahorro, 0.12, 10), abs=1)
    assert r.meses_recuperacion == approx(1_200_000 / ahorro, abs=0.1) and r.texto_recuperacion == "3 años y 1 mes"
    assert r.conviene is True and r.pagado_en_vida_util is True


def test_si_el_hogar_ya_paso_la_subsistencia_el_ahorro_vale_mas(client, auth, hogar):
    tarifa()
    for lectura, fecha in ((1000, "2026-10-01"), (1140, "2026-10-12")):  # 140 kWh en el mes: ya pasó los 130
        client.post(f"/hogares/{hogar['id']}/lecturas-medidor", json={"lectura_kwh": lectura, "fecha": fecha}, headers=auth)
    r = simular(hogar)
    assert r.precio_kwh_usado == 958.38 and r.ahorro_cop_mes == approx(40 * 958.38, abs=0.01)


def test_sin_ahorro_no_conviene_y_no_inventa_plazos(client, auth, hogar):
    tarifa()
    r = simular(hogar, actual=30, nuevo=40)
    assert (r.conviene, r.meses_recuperacion, r.texto_recuperacion, r.ahorro_cop_mes, r.vpn_cop) == (False, None, None, 0.0, -1_200_000)
    assert simular(hogar, actual=30, nuevo=30).conviene is False


def test_muy_caro_para_el_ahorro_da_vpn_negativo(client, auth, hogar):
    tarifa()
    r = simular(hogar, precio=5_000_000)  # 153 meses para recuperarlo y la vida útil es de 120
    assert r.conviene is False and r.vpn_cop < 0 and r.pagado_en_vida_util is False
    assert r.vpn_cop == approx(vpn_a_mano(5_000_000, 40 * 814.63, 0.12, 10), abs=1)


def test_tasa_cero_es_ahorro_por_meses_menos_precio(client, auth, hogar):
    tarifa()
    assert simular(hogar, tasa=0.0, anios=5).vpn_cop == approx(-1_200_000 + 40 * 814.63 * 60, abs=0.5)


def test_sin_tarifa_no_inventa_pesos(client, auth, hogar):
    r = simular(hogar)
    assert r.precio_kwh_usado is None and r.conviene is False and r.ahorro_cop_mes == 0 and r.texto_recuperacion is None


@pytest.mark.parametrize("meses,texto", [(35, "2 años y 11 meses"), (12, "1 año"), (13, "1 año y 1 mes"), (1, "1 mes"), (0.2, "1 mes"), (24.4, "2 años")])
def test_texto_de_recuperacion(meses, texto):
    assert service.texto_meses(meses) == texto  # "se paga sola en 2 años y 11 meses" (mockup)


# --- API ------------------------------------------------------------------------------------------------------------------------
CUERPO = {"consumo_actual_kwh_mes": 70, "consumo_nuevo_kwh_mes": 30, "precio_nuevo_cop": 1_200_000, "tasa_anual": 0.12, "anios": 10}


def test_endpoint_calcula_y_valida(client, auth, hogar):
    tarifa_actual = datetime.now(UTC).date().replace(day=1)
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=3, mes=tarifa_actual, cop_kwh_subsistencia="814.63", cop_kwh_sobre_subsistencia="958.38", fuente="prueba"))
        db.commit()
    r = client.post("/simulador/retiq", json={"hogar_id": hogar["id"], **CUERPO}, headers=auth)
    assert r.status_code == 200 and r.json()["conviene"] is True and r.json()["texto_recuperacion"] == "3 años y 1 mes"
    for malo in ({"precio_nuevo_cop": 0}, {"consumo_actual_kwh_mes": -1}, {"tasa_anual": 2}, {"anios": 0}, {"anios": 31}):
        assert client.post("/simulador/retiq", json={"hogar_id": hogar["id"], **CUERPO, **malo}, headers=auth).status_code == 422
    assert client.post("/simulador/retiq", json={"hogar_id": hogar["id"], **{k: v for k, v in CUERPO.items() if k != "tasa_anual"}}, headers=auth).status_code == 422  # la tasa no tiene valor por defecto


def test_endpoint_es_privado(client, auth, hogar):
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.post("/simulador/retiq", json={"hogar_id": hogar["id"], **CUERPO}, headers=otro).status_code == 403
    assert client.post("/simulador/retiq", json={"hogar_id": hogar["id"], **CUERPO}).status_code == 401
