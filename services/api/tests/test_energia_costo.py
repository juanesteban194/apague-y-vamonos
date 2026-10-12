"""Energía y costo contra cálculos hechos a mano."""
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from pytest import approx
from sqlalchemy import insert

from app.core.database import get_sessionmaker
from app.modules.consumo.costo import costo_de, costo_por_bloques, precio_medio
from app.modules.consumo.energia import BOGOTA, energia_por_cubeta
from app.modules.ingesta.models import Lectura

T0 = datetime(2026, 10, 12, 15, 0, 0, tzinfo=UTC)  # 10:00 en Bogotá


def sembrar(dispositivo_id, puntos):
    """puntos: lista de (segundos desde T0, potencia en W)."""
    with get_sessionmaker()() as db:
        db.execute(
            insert(Lectura),
            [
                {"dispositivo_id": dispositivo_id, "fecha_hora": T0 + timedelta(seconds=s), "potencia_w": w,
                 "voltaje_v": 128.0, "corriente_ma": 0, "encendido": True}
                for s, w in puntos
            ],
        )
        db.commit()


def kwh(db, dispositivo_id, desde, hasta, cubeta="day"):
    return energia_por_cubeta(db, [dispositivo_id], desde, hasta, cubeta)


def test_100_w_durante_una_hora(enchufe):
    # 721 lecturas cada 5 s = 3600 s a 100 W → 100 W × 3600 s / 3.600.000 = 0,1 kWh
    d = uuid.UUID(enchufe["id"])
    sembrar(d, [(5 * i, 100) for i in range(721)])
    with get_sessionmaker()() as db:
        r = kwh(db, d, T0, T0 + timedelta(hours=2))
    assert list(r.values()) == [approx(0.1)]


def test_un_hueco_mayor_a_60_s_no_se_integra(enchufe):
    d = uuid.UUID(enchufe["id"])
    # 0 s y 5 s a 100 W (5 s integrados), salto de 120 s (hueco), 125 s y 130 s (5 s integrados).
    sembrar(d, [(0, 100), (5, 100), (125, 100), (130, 100)])
    with get_sessionmaker()() as db:
        r = kwh(db, d, T0, T0 + timedelta(hours=1))
    assert sum(r.values()) == approx(100 * (5 + 5) / 3_600_000)


def test_exactamente_60_s_si_se_integra(enchufe):
    d = uuid.UUID(enchufe["id"])
    sembrar(d, [(0, 200), (60, 0)])
    with get_sessionmaker()() as db:
        assert sum(kwh(db, d, T0, T0 + timedelta(hours=1)).values()) == approx(200 * 60 / 3_600_000)


def test_cubetas_por_hora_en_zona_bogota(enchufe):
    d = uuid.UUID(enchufe["id"])
    # 09:59:55 → 10:00:05 hora Bogotá: el intervalo que arranca antes de las 10 cuenta en la hora 9.
    sembrar(d, [(-5, 100), (0, 100), (5, 100)])
    with get_sessionmaker()() as db:
        r = kwh(db, d, T0 - timedelta(hours=1), T0 + timedelta(hours=1), "hour")
    horas = {k[1].astimezone(BOGOTA).hour: v for k, v in r.items()}
    assert horas == {9: approx(100 * 5 / 3_600_000), 10: approx(100 * 5 / 3_600_000)}


def test_la_ultima_lectura_del_rango_usa_su_siguiente(enchufe):
    d = uuid.UUID(enchufe["id"])
    sembrar(d, [(0, 100), (5, 100), (10, 100)])
    with get_sessionmaker()() as db:
        # El rango termina en el segundo 10: cuenta [0,5) y [5,10); la lectura de 10 s queda fuera.
        assert sum(kwh(db, d, T0, T0 + timedelta(seconds=10)).values()) == approx(100 * 10 / 3_600_000)


def test_costo_por_bloques_a_mano():
    sub, sobre = Decimal("814.63"), Decimal("958.38")
    # 50 kWh: todo en el primer bloque → 50 × 814,63 = 40.731,50
    assert costo_por_bloques(50, 130, sub, sobre) == Decimal("40731.50")
    # 150 kWh: 130 × 814,63 + 20 × 958,38 = 105.901,90 + 19.167,60 = 125.069,50
    assert costo_por_bloques(150, 130, sub, sobre) == Decimal("125069.50")
    assert costo_por_bloques(0, 130, sub, sobre) == Decimal("0.00")


def test_precio_medio_y_costo_de():
    sub, sobre = Decimal("814.63"), Decimal("958.38")
    assert precio_medio(50, 130, sub, sobre) == sub  # bajo la subsistencia = tarifa exacta
    assert precio_medio(0, 130, sub, sobre) == sub
    assert costo_de(0.1, sub) == Decimal("81.46")  # 0,1 kWh × 814,63 = 81,463


def test_reproduce_una_factura_real_de_epm_al_centavo():
    """Factura EPM de junio de 2026, estrato 3, 250 kWh: energía a 876,970 = $219.242,50, subsidio $-17.100,92,
    total energía $202.141,58. La tarifa de subsistencia es el 85 % del costo unitario (subsidio de 15 % en estrato 3)."""
    cu = Decimal("876.970")
    sub = cu * Decimal("0.85")
    assert costo_por_bloques(250, 130, sub, cu) == Decimal("202141.58")


def test_sin_subsidio_el_costo_es_kwh_por_tarifa():
    # estratos 4, 5 y 6: la misma tarifa en los dos bloques → sin subsidio
    assert costo_por_bloques(200, 130, Decimal("958.38"), Decimal("958.38")) == Decimal("191676.00")
