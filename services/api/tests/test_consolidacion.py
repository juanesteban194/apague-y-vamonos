import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from pytest import approx
from sqlalchemy import func, insert, select

from app.core.database import get_sessionmaker
from app.jobs import tareas
from app.jobs.planificador import crear_planificador
from app.modules.consumo import consolidacion
from app.modules.consumo.energia import energia_hibrida, energia_por_cubeta
from app.modules.consumo.models import ConsumoHorario
from app.modules.ingesta.models import Lectura
from app.modules.tarifas.models import Tarifa

AHORA = datetime(2026, 10, 13, 15, 30, 0, tzinfo=UTC)  # 10:30 en Bogotá


def sembrar(dispositivo_id, inicio, vatios, minutos, primera=0):
    """Lecturas cada 5 s a `vatios` durante `minutos` desde `inicio` (ambos extremos incluidos):
    vatios × 60·minutos s / 3.600.000 kWh. `primera=1` omite la lectura de `inicio` para continuar otro bloque."""
    with get_sessionmaker()() as db:
        db.execute(
            insert(Lectura),
            [
                {"dispositivo_id": dispositivo_id, "fecha_hora": inicio + timedelta(seconds=5 * i), "potencia_w": vatios,
                 "voltaje_v": 128.0, "corriente_ma": 1, "encendido": True}
                for i in range(primera, minutos * 12 + 1)
            ],
        )
        db.commit()


def tarifa(mes, sub="814.63", sobre="958.38", estrato=3):
    with get_sessionmaker()() as db:
        db.add(Tarifa(estrato=estrato, mes=mes, cop_kwh_subsistencia=sub, cop_kwh_sobre_subsistencia=sobre, fuente="prueba"))
        db.commit()


def filas(db):
    return {f.hora: (f.kwh, f.costo_cop) for f in db.scalars(select(ConsumoHorario))}


def test_consolida_horas_completas_con_su_costo(enchufe):
    d = uuid.UUID(enchufe["id"])
    tarifa(datetime(2026, 10, 1).date())
    # 1 h exacta a 600 W desde las 12:00 UTC (07:00 Bogotá) = 0,6 kWh; la hora en curso (15:00 UTC) no se consolida
    sembrar(d, datetime(2026, 10, 13, 12, 0, tzinfo=UTC), 600, 60)
    sembrar(d, datetime(2026, 10, 13, 15, 0, tzinfo=UTC), 600, 10)
    with get_sessionmaker()() as db:
        assert consolidacion.consolidar_horas(db, AHORA) >= 1
        f = filas(db)
    assert datetime(2026, 10, 13, 15, 0, tzinfo=UTC) not in f
    kwh, costo = f[datetime(2026, 10, 13, 12, 0, tzinfo=UTC)]
    assert kwh == approx(0.6, rel=1e-6)
    assert costo == Decimal("488.78")  # 0,6 kWh × 814,63 = 488,778


def test_es_idempotente_y_corrige_lecturas_tardias(enchufe):
    d = uuid.UUID(enchufe["id"])
    sembrar(d, datetime(2026, 10, 13, 12, 0, tzinfo=UTC), 600, 30)  # media hora a 600 W = 0,3 kWh
    with get_sessionmaker()() as db:
        consolidacion.consolidar_horas(db, AHORA)
        consolidacion.consolidar_horas(db, AHORA)  # repetir no duplica ni cambia
        assert len(filas(db)) == 1
        assert filas(db)[datetime(2026, 10, 13, 12, 0, tzinfo=UTC)][0] == approx(0.3, rel=1e-6)
    # el agente estuvo sin internet y reenvía la segunda mitad de esa misma hora
    sembrar(d, datetime(2026, 10, 13, 12, 30, tzinfo=UTC), 600, 30, primera=1)
    with get_sessionmaker()() as db:
        consolidacion.consolidar_horas(db, AHORA)
        assert filas(db)[datetime(2026, 10, 13, 12, 0, tzinfo=UTC)][0] == approx(0.6, rel=1e-6)


def test_sin_tarifa_el_costo_queda_nulo_y_se_completa_despues(enchufe):
    d = uuid.UUID(enchufe["id"])
    sembrar(d, datetime(2026, 10, 13, 12, 0, tzinfo=UTC), 600, 60)
    with get_sessionmaker()() as db:
        consolidacion.consolidar_horas(db, AHORA)
        assert filas(db)[datetime(2026, 10, 13, 12, 0, tzinfo=UTC)][1] is None
    tarifa(datetime(2026, 10, 1).date())  # cargan la tarifa del mes
    with get_sessionmaker()() as db:
        consolidacion.consolidar_horas(db, AHORA)
        assert filas(db)[datetime(2026, 10, 13, 12, 0, tzinfo=UTC)][1] == Decimal("488.78")


def test_purga_solo_lo_anterior_a_30_dias_y_los_totales_no_cambian(enchufe):
    d = uuid.UUID(enchufe["id"])
    bloques = [(AHORA - timedelta(days=40)), (AHORA - timedelta(days=29, hours=3)), (AHORA - timedelta(days=2))]
    bloques = [b.replace(minute=0, second=0) for b in bloques]
    for inicio in bloques:
        sembrar(d, inicio, 1000, 30)  # 0,5 kWh cada bloque
    desde, hasta = AHORA - timedelta(days=45), AHORA

    with get_sessionmaker()() as db:
        antes = sum(energia_por_cubeta(db, [d], desde, hasta, "day").values())  # todo crudo, aún sin purgar
        assert antes == approx(1.5, rel=1e-6)
        for inicio in bloques:  # el tiempo pasa: el job horario consolidó cada bloque cuando estaba reciente
            consolidacion.consolidar_horas(db, inicio + timedelta(hours=3))
        _, borradas = consolidacion.tarea_diaria(db, AHORA)  # hoy: consolida los últimos 29 días y purga
        quedan = db.scalar(select(func.count()).select_from(Lectura))
        crudo_solo = sum(energia_por_cubeta(db, [d], desde, hasta, "day").values())
        total = sum(energia_hibrida(db, [d], desde, hasta, "day", AHORA).values())
    assert borradas > 0 and quedan > 0
    assert crudo_solo == approx(1.0, rel=1e-6)  # el crudo ya no tiene el bloque de hace 40 días…
    assert total == approx(antes, rel=1e-6)  # …pero crudo + consolidado da el mismo total que antes de purgar


def test_la_purga_no_toca_lecturas_recientes(enchufe):
    d = uuid.UUID(enchufe["id"])
    sembrar(d, AHORA - timedelta(days=29, hours=20), 100, 5)
    with get_sessionmaker()() as db:
        assert consolidacion.purgar_lecturas(db, AHORA) == 0


def test_las_tareas_no_dejan_escapar_excepciones(monkeypatch):
    def falla(*_):
        raise RuntimeError("base caída")

    monkeypatch.setattr(consolidacion, "consolidar_horas", falla)
    tareas.cada_hora(AHORA)  # no lanza: se registra y se reintenta en la siguiente pasada


def test_planificador_tiene_las_tres_cadencias():
    p = crear_planificador()
    assert {j.id for j in p.get_jobs()} == {"cada_minuto", "cada_hora", "cada_dia"}
    assert str(p.timezone) == "America/Bogota"


def test_el_planificador_no_corre_en_las_pruebas(client):
    from app.core.config import get_settings

    assert get_settings().jobs_activos is False  # las tareas se llaman a mano; nada corre por detrás
    assert client.get("/salud").status_code == 200
