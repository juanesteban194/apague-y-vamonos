"""Equivalencias cotidianas (HU-04): "es como dejar el televisor prendido 21 horas · o cargar el celular 340 veces".

Se calculan con los datos de la tabla `equivalencias` (energía o precio por unidad, con su fuente). Solo se muestran las que dan al menos una
unidad entera, de a dos por vez, rotando cada día para que no sea siempre la misma."""
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.consumo.models import Equivalencia


@dataclass(frozen=True)
class Frase:
    texto: str
    icono: str


def _miles(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def unidades(e: Equivalencia, costo_cop: float, precio_kwh: float | None) -> float | None:
    """Cuántas unidades de la equivalencia caben en `costo_cop`; None si falta un dato para calcularlo."""
    if e.tipo == "energia":
        if not precio_kwh or not e.wh_por_unidad:
            return None
        return costo_cop / precio_kwh * 1000 / e.wh_por_unidad
    if not e.costo_cop or float(e.costo_cop) <= 0:
        return None
    return costo_cop / float(e.costo_cop)


def para(db: Session, costo_cop: float | None, precio_kwh: float | None, ahora: datetime, maximo: int = 2) -> list[Frase]:
    if not costo_cop or costo_cop <= 0:
        return []
    candidatas: list[tuple[Equivalencia, int]] = []
    for e in db.scalars(select(Equivalencia).where(Equivalencia.activa.is_(True)).order_by(Equivalencia.nombre)):
        n = unidades(e, costo_cop, precio_kwh)
        if n is not None and int(n) >= 1:
            candidatas.append((e, int(n)))
    if not candidatas:
        return []
    inicio = ahora.toordinal() % len(candidatas)  # rota por día
    elegidas = (candidatas[inicio:] + candidatas[:inicio])[:maximo]
    frases = []
    for i, (e, n) in enumerate(elegidas):
        plantilla = e.plantilla_singular if n == 1 else e.plantilla_plural
        cuerpo = plantilla.replace("{n}", _miles(n))
        frases.append(Frase(("Es como " if i == 0 else "O ") + cuerpo + ".", e.icono))
    return frases
