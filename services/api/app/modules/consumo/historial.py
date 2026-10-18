"""Histórico de consumo de las facturas de EPM: cada mes en kWh (y lo pagado). Su promedio es el "consumo normal" del hogar."""
import uuid
from datetime import date

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.consumo.models import HistorialFactura

MESES_PARA_PROMEDIO = 6  # el histórico de la factura trae 6 meses
MESES_MINIMOS = 3  # con menos, un solo mes raro mueve demasiado el promedio (decisión técnica)


class MesFactura(BaseModel):
    mes: date  # cualquier día del mes; se guarda el primero
    kwh: float = Field(ge=0, le=100_000)
    valor_cop: float | None = Field(default=None, ge=0, le=1_000_000_000)

    @field_validator("mes")
    @classmethod
    def primer_dia(cls, v: date) -> date:
        return v.replace(day=1)


class HistorialIn(BaseModel):
    meses: list[MesFactura] = Field(max_length=12)


class HistorialOut(BaseModel):
    meses: list[MesFactura]
    meses_usados: int  # cuántos entran al promedio (los 6 más recientes)
    promedio_kwh: float | None  # None si hay menos de 3 meses
    promedio_cop: float | None  # promedio de lo pagado, con los meses que lo traen


def leer(db: Session, hogar_id: uuid.UUID) -> list[HistorialFactura]:
    return list(db.scalars(select(HistorialFactura).where(HistorialFactura.hogar_id == hogar_id).order_by(HistorialFactura.mes.desc())))


def promedios(filas: list[HistorialFactura]) -> tuple[int, float | None, float | None]:
    usados = filas[:MESES_PARA_PROMEDIO]  # filas viene de lo más reciente a lo más antiguo
    if len(usados) < MESES_MINIMOS:
        return len(usados), None, None
    pagados = [float(f.valor_cop) for f in usados if f.valor_cop is not None]
    return len(usados), sum(f.kwh for f in usados) / len(usados), (sum(pagados) / len(pagados) if pagados else None)


def salida(filas: list[HistorialFactura]) -> HistorialOut:
    n, kwh, cop = promedios(filas)
    return HistorialOut(
        meses=[MesFactura(mes=f.mes, kwh=f.kwh, valor_cop=float(f.valor_cop) if f.valor_cop is not None else None) for f in filas],
        meses_usados=n, promedio_kwh=round(kwh, 2) if kwh is not None else None, promedio_cop=round(cop, 2) if cop is not None else None,
    )


def reemplazar(db: Session, hogar_id: uuid.UUID, datos: HistorialIn) -> HistorialOut:
    """La persona manda todos los meses que anotó: lo anterior se reemplaza (más simple que editar mes por mes)."""
    meses = [m.mes for m in datos.meses]
    if len(set(meses)) != len(meses):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Anotaste el mismo mes dos veces. Deja solo uno e intenta de nuevo.")
    db.execute(delete(HistorialFactura).where(HistorialFactura.hogar_id == hogar_id))
    db.add_all(HistorialFactura(hogar_id=hogar_id, mes=m.mes, kwh=m.kwh, valor_cop=m.valor_cop) for m in datos.meses)
    db.commit()
    return salida(leer(db, hogar_id))
