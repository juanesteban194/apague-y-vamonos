import uuid
from datetime import UTC, date, datetime

import pytest
from pytest import approx

from app.core.database import get_sessionmaker
from app.modules.consumo import semaforo
from app.modules.hogares.models import Hogar
from app.modules.tarifas.models import Tarifa

from .conftest import registrar_y_entrar

AHORA = datetime(2026, 10, 13, 15, 0, 0, tzinfo=UTC)  # 13-oct-2026; octubre tiene 31 días
# Histórico de una factura real de EPM (junio de 2026): 6 meses y su promedio impreso, "PROM = 179"
FACTURA = [("2025-12", 170), ("2026-01", 194), ("2026-02", 194), ("2026-03", 152), ("2026-04", 168), ("2026-05", 197)]
PROMEDIO = (170 + 194 + 194 + 152 + 168 + 197) / 6


def historial(client, auth, hogar, meses=FACTURA, valor=None):
    cuerpo = {"meses": [{"mes": f"{m}-15", "kwh": k, **({"valor_cop": valor} if valor else {})} for m, k in meses]}
    return client.put(f"/hogares/{hogar['id']}/historial-consumo", json=cuerpo, headers=auth)


def lectura(client, auth, hogar, kwh, fecha):
    assert client.post(f"/hogares/{hogar['id']}/lecturas-medidor", json={"lectura_kwh": kwh, "fecha": fecha}, headers=auth).status_code == 201


def tarifa():
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=3, mes=date(2026, 10, 1), cop_kwh_subsistencia="814.63", cop_kwh_sobre_subsistencia="958.38", fuente="prueba"))
        db.commit()


def calcular(hogar):
    with get_sessionmaker()() as db:
        return semaforo.calcular(db, db.get(Hogar, uuid.UUID(hogar["id"])), AHORA)


# --- histórico -----------------------------------------------------------------------------------------------------------------
def test_el_promedio_coincide_con_el_de_la_factura_de_epm(client, auth, hogar):
    r = historial(client, auth, hogar).json()
    assert r["meses_usados"] == 6 and r["promedio_kwh"] == approx(179.17, abs=0.01)  # la factura imprime PROM = 179
    assert [m["mes"] for m in r["meses"]][:2] == ["2026-05-01", "2026-04-01"]  # de lo más reciente a lo más antiguo, primer día del mes


def test_con_menos_de_tres_meses_no_hay_promedio(client, auth, hogar):
    r = historial(client, auth, hogar, FACTURA[:2]).json()
    assert r["meses_usados"] == 2 and r["promedio_kwh"] is None and r["promedio_cop"] is None


def test_solo_los_seis_meses_mas_recientes_entran_al_promedio(client, auth, hogar):
    r = historial(client, auth, hogar, [("2025-06", 1000)] + FACTURA).json()  # un mes viejo y raro
    assert r["meses_usados"] == 6 and r["promedio_kwh"] == approx(PROMEDIO, abs=0.01)


def test_promedio_de_lo_pagado_solo_con_los_meses_que_lo_traen(client, auth, hogar):
    cuerpo = {"meses": [{"mes": "2026-03-01", "kwh": 150, "valor_cop": 150000}, {"mes": "2026-04-01", "kwh": 170, "valor_cop": 170000}, {"mes": "2026-05-01", "kwh": 190}]}
    r = client.put(f"/hogares/{hogar['id']}/historial-consumo", json=cuerpo, headers=auth).json()
    assert r["promedio_kwh"] == 170 and r["promedio_cop"] == 160000


def test_guardar_reemplaza_lo_anterior_y_valida(client, auth, hogar):
    historial(client, auth, hogar)
    assert len(historial(client, auth, hogar, FACTURA[:3]).json()["meses"]) == 3
    url = f"/hogares/{hogar['id']}/historial-consumo"
    assert client.put(url, json={"meses": [{"mes": "2026-05-01", "kwh": 1}, {"mes": "2026-05-20", "kwh": 2}]}, headers=auth).status_code == 422  # mes repetido
    assert client.put(url, json={"meses": [{"mes": "2026-05-01", "kwh": -1}]}, headers=auth).status_code == 422
    assert client.put(url, json={"meses": [{"mes": f"2025-{m:02d}-01", "kwh": 1} for m in range(1, 13)] + [{"mes": "2024-01-01", "kwh": 1}]}, headers=auth).status_code == 422
    assert len(client.get(url, headers=auth).json()["meses"]) == 3  # lo rechazado no tocó nada


def test_el_historial_es_privado(client, auth, hogar):
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get(f"/hogares/{hogar['id']}/historial-consumo", headers=otro).status_code == 403
    assert client.put(f"/hogares/{hogar['id']}/historial-consumo", json={"meses": []}, headers=otro).status_code == 403
    assert client.get(f"/hogares/{hogar['id']}/historial-consumo").status_code == 401


# --- semáforo --------------------------------------------------------------------------------------------------------------------
@pytest.mark.parametrize(
    "proyeccion,esperado",
    [(100, "verde"), (PROMEDIO, "verde"), (PROMEDIO + 0.01, "amarillo"), (PROMEDIO * 1.10, "amarillo"), (PROMEDIO * 1.10 + 0.01, "rojo"), (300, "rojo")],
)
def test_los_cortes_del_semaforo(proyeccion, esperado):
    assert semaforo.nivel_de(proyeccion, PROMEDIO) == esperado


def test_sin_historial_pide_anotar_las_facturas(client, auth, hogar):
    s = calcular(hogar)
    assert (s.estado, s.nivel) == ("sin_historial", None) and "factura" in s.mensaje


def test_sin_dos_lecturas_pide_el_medidor(client, auth, hogar):
    historial(client, auth, hogar)
    assert calcular(hogar).estado == "sin_medidor"
    lectura(client, auth, hogar, 1000, "2026-10-13")  # una sola lectura
    assert calcular(hogar).estado == "sin_medidor"
    lectura(client, auth, hogar, 1005, "2026-10-13")  # otra el mismo día: no hay ritmo que medir
    s = calcular(hogar)
    assert s.estado == "sin_medidor" and s.promedio_kwh == approx(PROMEDIO, abs=0.01)


def test_verde_proyecta_el_mes_con_el_ritmo_y_dice_cuanto_ahorra(client, auth, hogar):
    historial(client, auth, hogar)
    tarifa()
    lectura(client, auth, hogar, 1000, "2026-10-01")
    lectura(client, auth, hogar, 1060, "2026-10-13")  # 60 kWh en 12 días → 5 kWh/día → 155 kWh en octubre (31 días)
    s = calcular(hogar)
    assert (s.estado, s.nivel, s.titulo) == ("ok", "verde", "Vas bien")
    assert s.proyeccion_kwh == approx(155.0) and s.promedio_kwh == approx(179.17, abs=0.01)
    # ambos pasan de 130 kWh: la diferencia es (155 − 179,17) kWh × $958,38 (tarifa sobre subsistencia)
    esperado = (155 - PROMEDIO) * 958.38
    assert s.diferencia_cop == approx(esperado, abs=2)
    assert f"unos ${round(abs(esperado)):,}".replace(",", ".") + " menos que tu promedio" in s.mensaje


def test_amarillo_y_rojo_dicen_cuanto_pagaria_de_mas(client, auth, hogar):
    historial(client, auth, hogar)
    tarifa()
    lectura(client, auth, hogar, 1000, "2026-10-01")
    lectura(client, auth, hogar, 1074, "2026-10-13")  # 74/12×31 = 191,2 kWh → 6,7 % sobre el promedio
    s = calcular(hogar)
    assert (s.nivel, s.titulo) == ("amarillo", "Vas medio alto") and "más que tu promedio" in s.mensaje and s.diferencia_cop > 0
    lectura(client, auth, hogar, 1090, "2026-10-13")  # 90/12×31 = 232,5 kWh → 30 % sobre el promedio
    s2 = calcular(hogar)
    assert (s2.nivel, s2.titulo) == ("rojo", "Vas alto") and s2.diferencia_cop > s.diferencia_cop


def test_sin_tarifa_no_inventa_pesos(client, auth, hogar):
    historial(client, auth, hogar)
    lectura(client, auth, hogar, 1000, "2026-10-01")
    lectura(client, auth, hogar, 1090, "2026-10-13")
    s = calcular(hogar)
    assert s.nivel == "rojo" and s.diferencia_cop is None and "$" not in s.mensaje


def test_el_resumen_trae_el_semaforo(client, auth, hogar, enchufe):
    r = client.get(f"/hogares/{hogar['id']}/resumen", headers=auth).json()["semaforo"]
    assert r["estado"] == "sin_historial" and r["nivel"] is None
