import uuid
from datetime import datetime, time

from sqlalchemy import ARRAY, Boolean, DateTime, Float, ForeignKey, SmallInteger, String, Time, UniqueConstraint, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class Rutina(Base):
    __tablename__ = "rutinas"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    dispositivo_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dispositivos.id", ondelete="CASCADE"), index=True
    )
    dias: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger))  # 0 = lunes … 6 = domingo
    hora_apagado: Mapped[time] = mapped_column(Time)
    hora_encendido: Mapped[time | None] = mapped_column(Time)
    activa: Mapped[bool] = mapped_column(Boolean, server_default=true(), default=True)


class EventoRutina(Base):
    """Una ejecución de una rutina. La restricción única (rutina, acción, hora programada) es lo que impide ejecutarla dos veces."""

    __tablename__ = "eventos_rutina"
    __table_args__ = (UniqueConstraint("rutina_id", "accion", "programada_en", name="una_ejecucion_por_horario"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    rutina_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rutinas.id", ondelete="CASCADE"), index=True)
    accion: Mapped[str] = mapped_column(String(10), server_default="apagar")  # apagar | encender
    programada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ejecutado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resultado: Mapped[str] = mapped_column(String(200))  # pendiente | ok | error: <motivo>
    kwh_evitados: Mapped[float | None] = mapped_column(Float)  # estimado
