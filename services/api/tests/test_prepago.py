import uuid
from datetime import UTC, datetime, timedelta

from pytest import approx

from app.core.database import get_sessionmaker
from app.modules.alertas import reglas
from app.modules.prepago import service
from app.modules.prepago.service import Registro, promedio_diario, proyectar

from .conftest import registrar_y_entrar

AHORA = datetime(2026, 10, 13, 15, 0, 0, tzinfo=UTC)
D = timedelta(days=1)


def r(saldo, hace):
    return Registro(saldo, AHORA - hace)


def test_promedio_de_tres_dias_hecho_a_mano():
    # baja 4.000 por día durante 3 días
    assert promedio_diario([r(30000, 3 * D), r(26000, 2 * D), r(22000, D), r(18000, timedelta(0))], AHORA) == approx(4000)


def test_los_tramos_que_salen_de_la_ventana_cuentan_solo_lo_que_cae_dentro():
    # el tramo de -4d a -2d baja 8.000 en 2 días; solo 1 de esos 2 días está dentro de los 3 días → 4.000
    registros = [r(40000, 5 * D), r(36000, 4 * D), r(28000, 2 * D), r(20000, timedelta(0))]
    # gasto en ventana = 4.000 (mitad del tramo) + 8.000 (tramo completo) = 12.000 en 3 días
    assert promedio_diario(registros, AHORA) == approx(4000)


def test_una_recarga_no_cuenta_como_gasto():
    registros = [r(10000, 2 * D), r(8000, D), r(50000, timedelta(hours=12)), r(48000, timedelta(0))]
    # tramos usables: 2.000 en 1 día y 2.000 en medio día (la recarga se descarta) → 4.000 en 1,5 días
    assert promedio_diario(registros, AHORA) == approx(4000 / 1.5)


def test_con_menos_de_un_dia_de_historia_no_proyecta():
    assert promedio_diario([r(20000, timedelta(hours=6)), r(19000, timedelta(0))], AHORA) is None
    assert promedio_diario([r(20000, timedelta(0))], AHORA) is None


def test_proyeccion_verde_cuando_alcanza_para_mas_de_dos_dias():
    p = proyectar([r(30000, 3 * D), r(26000, 2 * D), r(22000, D), r(18000, timedelta(0))], AHORA)
    assert (p.estado, p.nivel, p.saldo_cop, p.promedio_diario_cop) == ("ok", "verde", 18000, 4000)
    assert p.dias_restantes == approx(4.5) and p.se_acaba_el == AHORA + timedelta(days=4.5)


def test_alerta_roja_con_menos_de_48_horas():
    # baja 3.000 + 4.000 + 3.000 = 10.000 en 3 días (3.333/día) y quedan 5.000: alcanza para 1,5 días = 36 h
    p = proyectar([r(15000, 3 * D), r(12000, 2 * D), r(8000, D), r(5000, timedelta(0))], AHORA)
    assert p.nivel == "rojo" and p.dias_restantes == approx(1.5)
    # 2.666/día con 6.000 de saldo alcanza para 54 h: todavía verde
    assert proyectar([r(14000, 3 * D), r(10000, 2 * D), r(8000, D), r(6000, timedelta(0))], AHORA).nivel == "verde"
    justo = proyectar([r(20000, 2 * D), r(14000, D), r(8000, timedelta(0))], AHORA)  # 6.000/día, quedan 8.000 → 32 h
    assert justo.nivel == "rojo" and justo.dias_restantes == approx(8000 / 6000, abs=0.01)


def test_si_el_saldo_ya_deberia_haberse_acabado():
    p = proyectar([r(10000, 4 * D), r(2000, 3 * D), r(1000, 2 * D)], AHORA)  # el último registro es de hace 2 días
    assert p.estado == "ok" and p.dias_restantes == 0 and p.nivel == "rojo"


def test_sin_consumo_medible_no_inventa_dias():
    p = proyectar([r(20000, 2 * D), r(20000, D), r(20000, timedelta(0))], AHORA)
    assert (p.estado, p.dias_restantes, p.se_acaba_el, p.nivel) == ("ok", None, None, "verde")


def test_sin_registros_y_datos_insuficientes():
    assert proyectar([], AHORA).estado == "sin_registros"
    p = proyectar([r(20000, timedelta(hours=3)), r(19500, timedelta(0))], AHORA)
    assert (p.estado, p.saldo_cop, p.dias_restantes) == ("datos_insuficientes", 19500, None)


# --- endpoints ------------------------------------------------------------------------------------------------------------------
def test_registrar_y_ver_el_saldo(client, auth, hogar):
    vacio = client.get(f"/hogares/{hogar['id']}/prepago", headers=auth).json()
    assert vacio["estado"] == "sin_registros" and vacio["registros"] == []
    r1 = client.put(f"/hogares/{hogar['id']}/prepago", json={"saldo_cop": 28500}, headers=auth)
    assert r1.status_code == 200 and r1.json()["saldo_cop"] == 28500 and r1.json()["estado"] == "datos_insuficientes"
    assert len(client.get(f"/hogares/{hogar['id']}/prepago", headers=auth).json()["registros"]) == 1


def test_validaciones_y_permisos(client, auth, hogar):
    for malo in (-1, "mucho", None):
        assert client.put(f"/hogares/{hogar['id']}/prepago", json={"saldo_cop": malo}, headers=auth).status_code == 422
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get(f"/hogares/{hogar['id']}/prepago", headers=otro).status_code == 403
    assert client.put(f"/hogares/{hogar['id']}/prepago", json={"saldo_cop": 1}, headers=otro).status_code == 403
    assert client.get(f"/hogares/{hogar['id']}/prepago").status_code == 401


def test_el_aviso_rojo_sale_una_vez_por_registro(client, auth, hogar):
    h = uuid.UUID(hogar["id"])
    with get_sessionmaker()() as db:
        for saldo, hace in ((15000, 3 * D), (12000, 2 * D), (8000, D), (5000, timedelta(0))):
            service.registrar_saldo(db, h, saldo, AHORA - hace)
        (_, nivel, titulo, mensaje), = [(a.tipo, a.nivel, a.titulo, a.mensaje) for a in reglas.evaluar_prepago(db, AHORA)]
        assert (nivel, titulo) == ("rojo", "Su saldo prepago se está acabando") and "horas" in mensaje
        assert reglas.evaluar_prepago(db, AHORA + timedelta(minutes=1)) == []  # no repite
        service.registrar_saldo(db, h, 1500, AHORA + timedelta(hours=2))  # nuevo registro, sigue bajo: nuevo aviso
        assert len(reglas.evaluar_prepago(db, AHORA + timedelta(hours=2, minutes=1))) == 1


def test_con_saldo_de_sobra_no_avisa(client, auth, hogar):
    h = uuid.UUID(hogar["id"])
    with get_sessionmaker()() as db:
        for saldo, hace in ((30000, 3 * D), (26000, 2 * D), (22000, D), (18000, timedelta(0))):
            service.registrar_saldo(db, h, saldo, AHORA - hace)
        assert reglas.evaluar_prepago(db, AHORA) == []
