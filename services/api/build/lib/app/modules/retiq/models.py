import uuid

from sqlalchemy import CheckConstraint, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class RetiqReferencia(Base):
    """Tabla RETIQ armada a mano (no hay API pública); cada fila lleva su fuente."""

    __tablename__ = "retiq_referencia"
    __table_args__ = (CheckConstraint("clase IN ('A','B','C','D','E','F','G')", name="clase_valida"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    categoria: Mapped[str] = mapped_column(String(80))
    clase: Mapped[str] = mapped_column(String(1))
    consumo_min_kwh_mes: Mapped[float] = mapped_column(Float)
    consumo_max_kwh_mes: Mapped[float] = mapped_column(Float)
    fuente: Mapped[str] = mapped_column(String(255))
