import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import insert, update

from app.core.database import get_sessionmaker
from app.modules.consumo.energia import BOGOTA
from app.modules.hogares.models import Hogar
from app.modules.ingesta.models import Lectura
from app.modules.tarifas.models import Tarifa

from .conftest import registrar_y_entrar


def sembrar_un_minuto(dispositivo_id, vatios=600):
    """13 lecturas cada 5 s que terminan hace 5 s: 12 intervalos = 60 s a `vatios`."""
    fin = datetime.now(UTC) - timedelta(seconds=5)
    with get_sessionmaker()() as db:
        db.execute(
            insert(Lectura),
            [
                {"dispositivo_id": dispositivo_id, "fecha_hora": fin - timedelta(seconds=5 * (12 - i)),
                 "potencia_w": vatios, "voltaje_v": 128.0, "corriente_ma": 4700, "encendido": True}
                for i in range(13)
            ],
        )
        db.commit()


def cargar_tarifa_del_mes(estrato=3, sub="814.63", sobre="958.38"):
    mes = datetime.now(BOGOTA).date().replace(day=1)
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=estrato, mes=mes, cop_kwh_subsistencia=sub, cop_kwh_sobre_subsistencia=sobre, fuente="prueba"))
        db.commit()
    return mes


def test_resumen_sin_tarifa_ni_lecturas(client, auth, hogar, enchufe):
    r = client.get(f"/hogares/{hogar['id']}/resumen", headers=auth).json()
    assert r["tarifa"] is None and r["costo_mes_cop"] is None and r["kwh_mes"] == 0
    d = r["dispositivos"][0]
    assert d["encendido"] is None and d["en_linea"] is False and d["costo_hoy_cop"] is None


def test_resumen_costo_igual_al_calculo_manual(client, auth, hogar, enchufe):
    mes = cargar_tarifa_del_mes()
    sembrar_un_minuto(uuid.UUID(enchufe["id"]), vatios=600)
    r = client.get(f"/hogares/{hogar['id']}/resumen", headers=auth).json()
    # 600 W × 60 s / 3.600.000 = 0,01 kWh; 0,01 × 814,63 = 8,1463 → 8,15
    d = r["dispositivos"][0]
    assert d["kwh_hoy"] == pytest.approx(0.01) and d["kwh_mes"] == pytest.approx(0.01)
    assert d["costo_hoy_cop"] == 8.15 and d["costo_mes_cop"] == 8.15
    assert r["costo_hoy_cop"] == 8.15 and r["costo_mes_cop"] == 8.15
    assert d["en_linea"] is True and d["encendido"] is True and d["potencia_w"] == 600
    assert r["tarifa"]["mes"] == mes.isoformat() and r["tarifa"]["es_del_mes_actual"] is True


def test_sobre_la_subsistencia_se_cobra_el_segundo_bloque(client, auth, hogar, enchufe):
    cargar_tarifa_del_mes()
    with get_sessionmaker()() as db:  # límite de 0,1 kWh para probar el cambio de bloque
        db.execute(update(Hogar).values(limite_subsistencia_kwh=0.1))
        db.commit()
    sembrar_un_minuto(uuid.UUID(enchufe["id"]), vatios=9000)  # 9000 W × 60 s / 3.600.000 = 0,15 kWh
    r = client.get(f"/hogares/{hogar['id']}/resumen", headers=auth).json()
    # 0,1 × 814,63 + 0,05 × 958,38 = 81,463 + 47,919 = 129,382 → 129,38
    assert r["costo_mes_cop"] == 129.38


@pytest.mark.parametrize("periodo,n", [("dia", 24), ("semana", 7)])
def test_consumo_por_periodo(client, auth, hogar, enchufe, periodo, n):
    cargar_tarifa_del_mes()
    sembrar_un_minuto(uuid.UUID(enchufe["id"]))
    r = client.get(f"/dispositivos/{enchufe['id']}/consumo", params={"periodo": periodo}, headers=auth).json()
    assert len(r["serie"]) == n
    assert r["kwh_total"] == pytest.approx(0.01) and r["costo_total_cop"] == 8.15
    assert sum(p["kwh"] for p in r["serie"]) == pytest.approx(0.01)
    assert sum(1 for p in r["serie"] if p["kwh"] > 0) in (1, 2)  # 2 si el minuto cruza el borde de hora


def test_consumo_del_mes_tiene_un_punto_por_dia(client, auth, hogar, enchufe):
    cargar_tarifa_del_mes()
    sembrar_un_minuto(uuid.UUID(enchufe["id"]))
    r = client.get(f"/dispositivos/{enchufe['id']}/consumo", params={"periodo": "mes"}, headers=auth).json()
    hoy = datetime.now(BOGOTA)
    siguiente = (hoy.replace(day=28) + timedelta(days=4)).replace(day=1)
    assert len(r["serie"]) == (siguiente - hoy.replace(day=1)).days


def test_periodo_invalido(client, auth, enchufe):
    assert client.get(f"/dispositivos/{enchufe['id']}/consumo", params={"periodo": "anio"}, headers=auth).status_code == 422


def test_permisos(client, hogar, enchufe):
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get(f"/hogares/{hogar['id']}/resumen", headers=otro).status_code == 403
    assert client.get(f"/dispositivos/{enchufe['id']}/consumo", params={"periodo": "dia"}, headers=otro).status_code == 403
    assert client.get(f"/dispositivos/{uuid.uuid4()}/consumo", params={"periodo": "dia"}, headers=otro).status_code == 404
    assert client.get(f"/hogares/{hogar['id']}/resumen").status_code == 401
