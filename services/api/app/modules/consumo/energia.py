"""Integración de energía: E_kWh = (1 / 3.600.000) × Σ (P_i[W] × Δt_i[s]).

Cada lectura i aporta P_i × Δt_i, con Δt_i = hasta la siguiente lectura del mismo dispositivo
(la potencia se mantiene hasta que llega la siguiente). Si Δt_i > 60 s es un hueco y no se integra;
la última lectura sin siguiente tampoco. Todo se calcula en SQL: un mes son ~500.000 filas por enchufe.
"""
import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.orm import Session

BOGOTA = ZoneInfo("America/Bogota")  # UTC-5 todo el año
HUECO_MAX_S = 60

_SQL = text(
    """
    WITH l AS (
        SELECT dispositivo_id, fecha_hora, potencia_w,
               LEAD(fecha_hora) OVER (PARTITION BY dispositivo_id ORDER BY fecha_hora) AS sig
        FROM lecturas
        WHERE dispositivo_id = ANY(CAST(:ids AS uuid[]))
          AND fecha_hora >= :desde AND fecha_hora < :hasta_ext
    )
    SELECT dispositivo_id,
           date_trunc(:cubeta, fecha_hora AT TIME ZONE 'America/Bogota') AS inicio,
           SUM(potencia_w * EXTRACT(EPOCH FROM (sig - fecha_hora)) / 3600000.0) AS kwh
    FROM l
    WHERE sig IS NOT NULL
      AND EXTRACT(EPOCH FROM (sig - fecha_hora)) <= :hueco
      AND fecha_hora < :hasta
    GROUP BY 1, 2
    ORDER BY 1, 2
    """
)


def energia_por_cubeta(
    db: Session,
    dispositivo_ids: list[uuid.UUID],
    desde: datetime,
    hasta: datetime,
    cubeta: Literal["hour", "day"],
) -> dict[tuple[uuid.UUID, datetime], float]:
    """kWh por (dispositivo, inicio de la hora/día en Bogotá) para lecturas en [desde, hasta).

    Se lee hasta `hasta` + 60 s para que la última lectura del rango encuentre su siguiente.
    """
    if not dispositivo_ids:
        return {}
    filas = db.execute(
        _SQL,
        {
            "ids": dispositivo_ids,
            "desde": desde,
            "hasta": hasta,
            "hasta_ext": hasta + timedelta(seconds=HUECO_MAX_S),
            "cubeta": cubeta,
            "hueco": HUECO_MAX_S,
        },
    )
    return {(f.dispositivo_id, f.inicio.replace(tzinfo=BOGOTA)): float(f.kwh) for f in filas}


def inicio_dia_bogota(instante: datetime) -> datetime:
    local = instante.astimezone(BOGOTA)
    return local.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(UTC)


def inicio_mes_bogota(instante: datetime) -> datetime:
    local = instante.astimezone(BOGOTA)
    return local.replace(day=1, hour=0, minute=0, second=0, microsecond=0).astimezone(UTC)


# --- Lecturas crudas (30 días) + consolidado por hora (para siempre) ---------------------------------------------------
DIAS_CRUDOS = 30
MARGEN_DIAS = 1  # se consulta el crudo solo desde hace 29 días: esos días siempre están completos aunque la purga vaya atrasada


def inicio_hora(instante: datetime) -> datetime:
    """Bogotá está en UTC-5 sin horario de verano: las horas locales y las UTC empiezan en el mismo minuto."""
    return instante.replace(minute=0, second=0, microsecond=0)


_SQL_CONSOLIDADO = text(
    """
    SELECT dispositivo_id,
           date_trunc(:cubeta, hora AT TIME ZONE 'America/Bogota') AS inicio,
           SUM(kwh) AS kwh
    FROM consumo_horario
    WHERE dispositivo_id = ANY(CAST(:ids AS uuid[])) AND hora >= :desde AND hora < :hasta
    GROUP BY 1, 2
    """
)


def energia_hibrida(
    db: Session,
    dispositivo_ids: list[uuid.UUID],
    desde: datetime,
    hasta: datetime,
    cubeta: Literal["hour", "day"],
    ahora: datetime | None = None,
) -> dict[tuple[uuid.UUID, datetime], float]:
    """Como `energia_por_cubeta`, pero lo anterior a los últimos 29 días sale de `consumo_horario` (las lecturas
    crudas se purgan a los 30). Así un mes o un año consultado después de la purga da la misma energía."""
    if not dispositivo_ids:
        return {}
    ahora = ahora or datetime.now(UTC)
    corte = inicio_hora(ahora - timedelta(days=DIAS_CRUDOS - MARGEN_DIAS))
    resultado: dict[tuple[uuid.UUID, datetime], float] = {}

    def sumar(parcial: dict) -> None:
        for clave, kwh in parcial.items():
            resultado[clave] = resultado.get(clave, 0.0) + kwh

    if desde < corte:
        filas = db.execute(
            _SQL_CONSOLIDADO,
            {"ids": dispositivo_ids, "desde": desde, "hasta": min(hasta, corte), "cubeta": cubeta},
        )
        sumar({(f.dispositivo_id, f.inicio.replace(tzinfo=BOGOTA)): float(f.kwh) for f in filas})
    if hasta > corte:
        sumar(energia_por_cubeta(db, dispositivo_ids, max(desde, corte), hasta, cubeta))
    return resultado
