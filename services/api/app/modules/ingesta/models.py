import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Lectura(Base):
    """Lectura cruda cada ~5 s. Retención de 30 días (la limpieza llega con los jobs)."""

    __tablename__ = "lecturas"

    dispositivo_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dispositivos.id", ondelete="CASCADE"), primary_key=True
    )
    fecha_hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    potencia_w: Mapped[float] = mapped_column(Float)
    voltaje_v: Mapped[float] = mapped_column(Float)
    corriente_ma: Mapped[int] = mapped_column(Integer)
    encendido: Mapped[bool] = mapped_column(Boolean)
