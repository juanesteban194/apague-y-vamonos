"""Línea de subsistencia (HU-07): cuánto del límite mensual (130 kWh en Medellín) lleva el hogar.

Con lecturas del medidor EPM se usa el medidor (refleja toda la casa). Sin ellas solo se conoce lo que miden los enchufes, y así se indica."""
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.consumo.energia import BOGOTA, energia_hibrida, inicio_mes_bogota
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Hogar, LecturaMedidor

UMBRAL_AMARILLO = 0.8  # requisito: alerta al 80 % del límite


@dataclass(frozen=True)
class Subsistencia:
    limite_kwh: float
    consumo_kwh: float
    porcentaje: float  # 0,62 = 62 %
    fuente: Literal["medidor", "enchufes"]
    nivel: Literal["verde", "amarillo", "rojo"]


def _nivel(porcentaje: float) -> Literal["verde", "amarillo", "rojo"]:
    if porcentaje >= 1.0:
        return "rojo"
    return "amarillo" if porcentaje >= UMBRAL_AMARILLO else "verde"


def lecturas_del_mes(db: Session, hogar: Hogar, mes_ini: datetime) -> tuple[LecturaMedidor, LecturaMedidor] | None:
    """(lectura base, última lectura) del mes: la base es la del inicio del mes o, si no hay, la primera del mes. None si no hay dos
    lecturas de días distintos."""
    inicio = mes_ini.astimezone(BOGOTA).date()
    ultima = db.scalar(select(LecturaMedidor).where(LecturaMedidor.hogar_id == hogar.id).order_by(LecturaMedidor.fecha.desc(), LecturaMedidor.lectura_kwh.desc()).limit(1))
    if ultima is None:
        return None
    base = db.scalar(
        select(LecturaMedidor).where(LecturaMedidor.hogar_id == hogar.id, LecturaMedidor.fecha <= inicio).order_by(LecturaMedidor.fecha.desc(), LecturaMedidor.lectura_kwh.desc()).limit(1)
    ) or db.scalar(select(LecturaMedidor).where(LecturaMedidor.hogar_id == hogar.id, LecturaMedidor.fecha > inicio).order_by(LecturaMedidor.fecha, LecturaMedidor.lectura_kwh).limit(1))
    if base is None or ultima.fecha <= base.fecha:
        return None  # con una sola lectura no hay diferencia que calcular
    return base, ultima


def _consumo_del_medidor(db: Session, hogar: Hogar, mes_ini: datetime) -> float | None:
    """Consumo del mes según el medidor: última lectura menos la base."""
    par = lecturas_del_mes(db, hogar, mes_ini)
    return None if par is None else max(0.0, par[1].lectura_kwh - par[0].lectura_kwh)


def calcular(db: Session, hogar: Hogar, ahora: datetime) -> Subsistencia:
    mes_ini = inicio_mes_bogota(ahora)
    limite = float(hogar.limite_subsistencia_kwh)
    consumo = _consumo_del_medidor(db, hogar, mes_ini)
    fuente: Literal["medidor", "enchufes"] = "medidor"
    if consumo is None:
        ids = list(db.scalars(select(Dispositivo.id).where(Dispositivo.hogar_id == hogar.id)))
        consumo = sum(energia_hibrida(db, ids, mes_ini, ahora, "day", ahora).values())
        fuente = "enchufes"
    porcentaje = consumo / limite if limite > 0 else 0.0
    return Subsistencia(limite, consumo, porcentaje, fuente, _nivel(porcentaje))
