"""Corriente habitual por dispositivo y el aviso «¿hay algo más conectado a ese enchufe?» (por encima o por debajo de lo normal)."""
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import insert

from app.core.database import get_sessionmaker
from app.modules.alertas import otro_dispositivo
from app.modules.dispositivos import corriente
from app.modules.ingesta.models import Lectura

from .conftest import registrar_y_entrar

AHORA = datetime(2026, 10, 15, 15, 0, tzinfo=UTC)


@pytest.fixture(autouse=True)
def _sin_cache():
    corriente._cache.clear()
    yield
    corriente._cache.clear()


def sembrar(dispositivo_id, desde, minutos, ma, encendido=True):
    """Una lectura cada 5 s durante `minutos` con `ma` miliamperios (± un poco, como un dispositivo real)."""
    filas = [
        {"dispositivo_id": dispositivo_id, "fecha_hora": desde + timedelta(seconds=5 * i), "potencia_w": ma * 0.12, "voltaje_v": 120.0,
         "corriente_ma": int(ma + (i % 5 - 2) * 10), "encendido": encendido}
        for i in range(minutos * 12)
    ]
    with get_sessionmaker()() as db:
        db.execute(insert(Lectura), filas)
        db.commit()


def con_base(d, ma=800, dias=(12, 13, 14)):
    for dia in dias:
        sembrar(d, datetime(2026, 10, dia, 12, 0, tzinfo=UTC), 60, ma)  # una hora consumiendo cada día


def estado(d):
    with get_sessionmaker()() as db:
        return corriente.estado(db, d, AHORA, usar_cache=False)


def evaluar():
    with get_sessionmaker()() as db:
        return [(a.tipo, a.nivel, a.titulo, a.mensaje) for a in otro_dispositivo.evaluar_otro_dispositivo(db, AHORA)]


def test_aprende_antes_de_avisar(client, auth, hogar, enchufe):
    d = uuid.UUID(enchufe["id"])
    con_base(d, dias=(14,))  # un solo día: aún no sabe qué es lo normal
    sembrar(d, AHORA - timedelta(minutes=15), 15, 3000)
    assert estado(d).estado == "aprendiendo"
    assert evaluar() == []


def test_dentro_de_lo_normal_no_avisa(client, auth, hogar, enchufe):
    d = uuid.UUID(enchufe["id"])
    con_base(d)
    sembrar(d, AHORA - timedelta(minutes=15), 15, 830)
    e = estado(d)
    assert e.estado == "normal" and e.base.normal_ma == pytest.approx(800, abs=15) and e.ahora_ma == pytest.approx(830, abs=15)
    assert evaluar() == []


def test_mucha_mas_corriente_avisa_una_vez_al_dia(client, auth, hogar, enchufe):
    d = uuid.UUID(enchufe["id"])
    con_base(d)
    sembrar(d, AHORA - timedelta(minutes=15), 15, 2000)  # algo más conectado
    assert estado(d).estado == "alta"
    ((tipo, nivel, titulo, mensaje),) = evaluar()
    assert (tipo, nivel) == ("otro_dispositivo", "amarillo")
    assert titulo == "¿Hay algo más conectado al enchufe de Ventilador?"
    assert "2,0 A" in mensaje and "entre 0,78 A y 0,82 A" in mensaje and "multitoma" in mensaje
    assert evaluar() == []  # una vez al día


def test_mucha_menos_corriente_tambien_avisa(client, auth, hogar, enchufe):
    d = uuid.UUID(enchufe["id"])
    con_base(d)
    sembrar(d, AHORA - timedelta(minutes=15), 15, 250)
    ((_, _, titulo, mensaje),) = evaluar()
    assert titulo == "Ventilador está usando menos corriente de lo normal"
    assert "0,25 A" in mensaje and "Explorar › Enchufes" in mensaje


def test_apagado_o_un_rato_corto_no_avisa(client, auth, hogar, enchufe):
    d = uuid.UUID(enchufe["id"])
    con_base(d)
    sembrar(d, AHORA - timedelta(minutes=15), 12, 0, encendido=False)  # apagado 12 minutos…
    sembrar(d, AHORA - timedelta(minutes=3), 3, 2000)  # …y 3 minutos con mucha corriente no alcanzan
    assert estado(d).estado == "apagado"
    assert evaluar() == []


def test_en_cargas_pequenas_un_porcentaje_grande_es_ruido(client, auth, hogar, enchufe):
    d = uuid.UUID(enchufe["id"])
    con_base(d, ma=60)  # un cargador: 0,06 A
    sembrar(d, AHORA - timedelta(minutes=15), 15, 140)  # más del doble, pero solo 0,08 A más
    assert estado(d).estado == "normal"
    assert evaluar() == []


def test_la_app_ve_la_corriente_habitual(client, auth, hogar, enchufe):
    d = uuid.UUID(enchufe["id"])
    url = f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}/corriente"
    assert client.get(url, headers=auth).json() == {"estado": "aprendiendo", "normal_ma": None, "bajo_ma": None, "alto_ma": None, "ahora_ma": None, "dias": 0}
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get(url, headers=otro).status_code == 403


def test_amperios_en_formato_colombiano():
    assert corriente.amperios(820) == "0,82 A"
    assert corriente.amperios(2040) == "2,0 A"
