import random

from agent.collector.escalas import DPS_REQUERIDOS
from agent.collector.simulador import FACTOR_DE_POTENCIA, LectorSimulado

CAMPOS = {"tuya_id", "fecha_hora", "potencia_w", "voltaje_v", "corriente_ma", "encendido"}


def test_tiene_la_forma_que_espera_la_api():
    lectura = LectorSimulado("SIM-1", azar=random.Random(1)).leer()
    assert set(lectura) == CAMPOS and lectura["tuya_id"] == "SIM-1"
    assert lectura["fecha_hora"].endswith("+00:00")  # la API exige zona horaria
    assert lectura["encendido"] is True and lectura["potencia_w"] > 0


def test_potencia_voltaje_y_corriente_son_coherentes():
    lector = LectorSimulado("SIM-1", vatios=40, azar=random.Random(2))
    for _ in range(50):
        r = lector.leer()
        assert 36 <= r["potencia_w"] <= 44 and 127 <= r["voltaje_v"] <= 129
        aparente = r["voltaje_v"] * r["corriente_ma"] / 1000
        assert abs(r["potencia_w"] / aparente - FACTOR_DE_POTENCIA) < 0.02


def test_se_apaga_y_vuelve_a_encender():
    t = [0.0]
    lector = LectorSimulado("SIM-1", apagar_cada_s=100, apagado_s=20, reloj=lambda: t[0])
    t[0] = 50
    assert lector.leer()["encendido"] is True
    t[0] = 110  # dentro de los 20 s apagado
    apagado = lector.leer()
    assert (apagado["encendido"], apagado["potencia_w"], apagado["corriente_ma"]) == (False, 0.0, 0)
    t[0] = 125
    assert lector.leer()["encendido"] is True


def test_sin_ciclo_nunca_se_apaga():
    t = [0.0]
    lector = LectorSimulado("SIM-1", apagar_cada_s=None, reloj=lambda: t[0])
    for t[0] in (0, 500, 99999):
        assert lector.leer()["encendido"] is True


def test_la_lectura_simulada_cumple_las_validaciones_de_la_api():
    r = LectorSimulado("SIM-1").leer()
    assert r["potencia_w"] >= 0 and r["voltaje_v"] >= 0 and r["corriente_ma"] >= 0 and isinstance(r["corriente_ma"], int)
    assert len(DPS_REQUERIDOS) == 4  # el simulador reemplaza a todo el lector real, no a un DP suelto
