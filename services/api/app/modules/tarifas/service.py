from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.tarifas.models import Tarifa


def tarifa_vigente(db: Session, estrato: int, dia: date) -> Tarifa | None:
    """Tarifa del estrato para el mes de `dia`; si ese mes aún no se carga, la más reciente anterior."""
    primer_dia = dia.replace(day=1)
    return db.scalar(
        select(Tarifa)
        .where(Tarifa.estrato == estrato, Tarifa.mes <= primer_dia)
        .order_by(Tarifa.mes.desc())
        .limit(1)
    )
