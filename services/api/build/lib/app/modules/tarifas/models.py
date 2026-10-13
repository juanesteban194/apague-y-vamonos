import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, Numeric, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class Tarifa(Base):
    """Tarifa EPM por estrato y mes. Se carga a mano cada mes; no hay valores por defecto."""

    __tablename__ = "tarifas"
    __table_args__ = (
        UniqueConstraint("estrato", "mes", name="estrato_mes"),
        CheckConstraint("estrato BETWEEN 1 AND 6", name="estrato_valido"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    estrato: Mapped[int] = mapped_column(SmallInteger)
    mes: Mapped[date] = mapped_column(Date)  # primer día del mes
    cop_kwh_subsistencia: Mapped[float] = mapped_column(Numeric(10, 2))
    cop_kwh_sobre_subsistencia: Mapped[float] = mapped_column(Numeric(10, 2))
    fuente: Mapped[str] = mapped_column(String(255))
