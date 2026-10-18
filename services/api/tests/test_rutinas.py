import uuid
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest
from pytest import approx
from sqlalchemy import insert, select

from app.core.database import get_sessionmaker
from app.modules.alertas.models import Alerta
from app.modules.ingesta.models import Lectura
from app.modules.rutinas import ejecucion, service
from app.modules.rutinas.models import EventoRutina, Rutina
from app.modules.tarifas.models import Tarifa

from .conftest import registrar_y_entrar

BOGOTA = ZoneInfo("America/Bogota")


def local(anio, mes, dia, h, m, s=0):
    """Hora de Bogotá → UTC (UTC-5)."""
    return datetime(anio, mes, dia, h, m, s, tzinfo=BOGOTA).astimezone(UTC)


def rutina(dias, apagado, encendido=None):
    return Rutina(id=uuid.uuid4(), dispositivo_id=uuid.uuid4(), dias=dias, hora_apagado=apagado, hora_encendido=encendido, activa=True)


# 13-oct-2026 es martes (weekday 1)
def test_el_apagado_vence_en_su_minuto_con_cinco_de_tolerancia():
    r = rutina([1], time(22, 0))
    cuando = lambda h, m, s=0: [(a, p) for _, a, p in ejecucion.horarios_pendientes([r], local(2026, 10, 13, h, m, s))]
    assert cuando(21, 59, 59) == []
    assert cuando(22, 0) == [("apagar", local(2026, 10, 13, 22, 0))]
    assert len(cuando(22, 4, 59)) == 1
    assert cuando(22, 5) == []


def test_solo_en_los_dias_de_la_rutina():
    assert ejecucion.horarios_pendientes([rutina([0, 2, 3], time(22, 0))], local(2026, 10, 13, 22, 1)) == []  # martes no está
    assert len(ejecucion.horarios_pendientes([rutina([0, 1], time(22, 0))], local(2026, 10, 13, 22, 1))) == 1


def test_el_encendido_de_madrugada_pertenece_al_dia_anterior():
    r = rutina([1], time(23, 0), time(6, 0))  # apaga martes 23:00, enciende miércoles 06:00
    assert [a for _, a, _ in ejecucion.horarios_pendientes([r], local(2026, 10, 13, 23, 1))] == ["apagar"]
    assert [a for _, a, _ in ejecucion.horarios_pendientes([r], local(2026, 10, 14, 6, 2))] == ["encender"]  # miércoles
    assert ejecucion.horarios_pendientes([r], local(2026, 10, 15, 6, 2)) == []  # jueves: el miércoles no es día de la rutina


def test_encendido_el_mismo_dia_y_sin_encendido():
    r = rutina([1], time(13, 0), time(15, 0))
    assert [a for _, a, _ in ejecucion.horarios_pendientes([r], local(2026, 10, 13, 15, 1))] == ["encender"]
    assert ejecucion.horarios_pendientes([rutina([1], time(13, 0))], local(2026, 10, 13, 15, 1)) == []


def test_la_tolerancia_puede_cruzar_la_medianoche():
    r = rutina([1], time(23, 58))  # martes 23:58; el job despierta tarde, el miércoles 00:01
    assert len(ejecucion.horarios_pendientes([r], local(2026, 10, 14, 0, 1))) == 1


def test_horas_de_apagado():
    assert service.horas_apagado(time(22, 0), time(6, 0)) == 8
    assert service.horas_apagado(time(13, 0), time(15, 30)) == 2.5


# --- ejecución con base de datos ---------------------------------------------------------------------------------------------
def crear_rutina(client, auth, hogar, enchufe, **extra):
    cuerpo = {"dispositivo_id": enchufe["id"], "dias": [1], "hora_apagado": "22:00:00", "hora_encendido": "06:00:00", **extra}
    r = client.post(f"/hogares/{hogar['id']}/rutinas", json=cuerpo, headers=auth)
    assert r.status_code == 201, r.text
    return r.json()


class Enviar:
    def __init__(self, resultado=(True, None)):
        self.llamadas, self.resultado = [], resultado

    def __call__(self, hogar_id, dispositivo_id, tuya_id, accion):
        self.llamadas.append((tuya_id, accion))
        return self.resultado


def correr(enviar, ahora):
    with get_sessionmaker()() as db:
        return ejecucion.ejecutar_vencidas(db, ahora, enviar)


def eventos():
    with get_sessionmaker()() as db:
        return [(e.accion, e.resultado, e.kwh_evitados) for e in db.scalars(select(EventoRutina).order_by(EventoRutina.programada_en))]


def potencia_de_la_semana(dispositivo_id, vatios=100.0):
    ahora = datetime.now(UTC)
    with get_sessionmaker()() as db:
        db.execute(insert(Lectura), [{"dispositivo_id": dispositivo_id, "fecha_hora": ahora - timedelta(hours=i), "potencia_w": vatios,
                                       "voltaje_v": 128.0, "corriente_ma": 1, "encendido": True} for i in range(1, 49)])
        db.commit()


def test_apaga_a_su_hora_y_guarda_el_ahorro_estimado(client, auth, hogar, enchufe):
    crear_rutina(client, auth, hogar, enchufe)
    potencia_de_la_semana(uuid.UUID(enchufe["id"]), 100)
    enviar = Enviar()
    assert correr(enviar, local(2026, 10, 13, 22, 1)) == 1
    assert enviar.llamadas == [(enchufe["tuya_id"], "apagar")]
    (accion, resultado, kwh), = eventos()
    assert (accion, resultado) == ("apagar", "ok") and kwh == approx(0.8)  # 100 W × 8 h


def test_no_se_ejecuta_dos_veces_aunque_la_tarea_corra_varias_veces(client, auth, hogar, enchufe):
    crear_rutina(client, auth, hogar, enchufe)
    enviar = Enviar()
    for minuto in (1, 1, 2, 4):
        correr(enviar, local(2026, 10, 13, 22, minuto))
    assert enviar.llamadas == [(enchufe["tuya_id"], "apagar")]  # un solo comando
    assert len(eventos()) == 1


def test_enciende_al_dia_siguiente_y_cada_horario_cuenta_aparte(client, auth, hogar, enchufe):
    crear_rutina(client, auth, hogar, enchufe)
    enviar = Enviar()
    correr(enviar, local(2026, 10, 13, 22, 1))
    correr(enviar, local(2026, 10, 14, 6, 1))
    assert [a for _, a in enviar.llamadas] == ["apagar", "encender"]
    assert [e[0] for e in eventos()] == ["apagar", "encender"]


def test_si_no_se_pudo_queda_registrado_y_avisa(client, auth, hogar, enchufe):
    crear_rutina(client, auth, hogar, enchufe)
    correr(Enviar((False, "no hay un agente conectado en tu casa")), local(2026, 10, 13, 22, 1))
    assert eventos()[0][1] == "error: no hay un agente conectado en tu casa"
    with get_sessionmaker()() as db:
        (a,) = list(db.scalars(select(Alerta)))
    assert (a.tipo, a.nivel, a.titulo) == ("rutina", "amarillo", "No pudimos apagar Ventilador") and "22:00" in a.mensaje


def test_rutinas_inactivas_no_se_ejecutan(client, auth, hogar, enchufe):
    crear_rutina(client, auth, hogar, enchufe, activa=False)
    enviar = Enviar()
    assert correr(enviar, local(2026, 10, 13, 22, 1)) == 0 and enviar.llamadas == []


# --- API ---------------------------------------------------------------------------------------------------------------------------
def test_crear_listar_actualizar_y_borrar(client, auth, hogar, enchufe):
    r = crear_rutina(client, auth, hogar, enchufe, dias=[4, 0, 0, 2])
    assert r["dias"] == [0, 2, 4] and r["dispositivo_nombre"] == "Ventilador" and r["ultima_ejecucion"] is None
    url = f"/hogares/{hogar['id']}/rutinas"
    assert [x["id"] for x in client.get(url, headers=auth).json()] == [r["id"]]
    cambio = {"dispositivo_id": enchufe["id"], "dias": [6], "hora_apagado": "23:30:00", "hora_encendido": None, "activa": False}
    nuevo = client.put(f"{url}/{r['id']}", json=cambio, headers=auth).json()
    assert (nuevo["dias"], nuevo["hora_apagado"], nuevo["hora_encendido"], nuevo["activa"]) == ([6], "23:30:00", None, False)
    assert client.delete(f"{url}/{r['id']}", headers=auth).status_code == 204
    assert client.get(url, headers=auth).json() == []
    assert client.delete(f"{url}/{r['id']}", headers=auth).status_code == 404


@pytest.mark.parametrize("cuerpo", [
    {"dias": [7], "hora_apagado": "22:00:00"},
    {"dias": [], "hora_apagado": "22:00:00"},
    {"dias": [1], "hora_apagado": "25:00:00"},
    {"dias": [1], "hora_apagado": "22:00:00", "hora_encendido": "22:00:00"},
])
def test_validaciones(client, auth, hogar, enchufe, cuerpo):
    r = client.post(f"/hogares/{hogar['id']}/rutinas", json={"dispositivo_id": enchufe["id"], **cuerpo}, headers=auth)
    assert r.status_code == 422


def test_no_se_puede_programar_un_aparato_de_otro_hogar(client, auth, hogar, enchufe):
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    h2 = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=otro).json()
    r = client.post(f"/hogares/{h2['id']}/rutinas", json={"dispositivo_id": enchufe["id"], "dias": [1], "hora_apagado": "22:00:00"}, headers=otro)
    assert r.status_code == 422 and "no es de tu casa" in r.json()["detail"]
    assert client.get(f"/hogares/{hogar['id']}/rutinas", headers=otro).status_code == 403
    assert client.post(f"/hogares/{hogar['id']}/rutinas", json={"dispositivo_id": enchufe["id"], "dias": [1], "hora_apagado": "22:00:00"}, headers=otro).status_code == 403


def test_el_ahorro_estimado_sale_de_la_potencia_real_y_la_tarifa(client, auth, hogar, enchufe):
    mes = datetime.now(BOGOTA).date().replace(day=1)
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=3, mes=mes, cop_kwh_subsistencia="814.63", cop_kwh_sobre_subsistencia="958.38", fuente="prueba"))
        db.commit()
    potencia_de_la_semana(uuid.UUID(enchufe["id"]), 100)
    r = crear_rutina(client, auth, hogar, enchufe, dias=[0, 1, 2, 3, 4])
    # 100 W × 8 h = 0,8 kWh por noche × 5 noches × 52/12 semanas por mes × $814,63
    assert r["ahorro_estimado_cop_mes"] == approx(0.8 * 5 * 52 / 12 * 814.63, abs=1)


def test_sin_datos_o_sin_encendido_no_inventa_ahorro(client, auth, hogar, enchufe):
    assert crear_rutina(client, auth, hogar, enchufe)["ahorro_estimado_cop_mes"] is None  # sin lecturas ni tarifa
    potencia_de_la_semana(uuid.UUID(enchufe["id"]))
    sin_encendido = crear_rutina(client, auth, hogar, enchufe, hora_encendido=None)
    assert sin_encendido["ahorro_estimado_cop_mes"] is None
