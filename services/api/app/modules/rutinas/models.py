import uuid
from datetime import datetime, time

from sqlalchemy import ARRAY, Boolean, DateTime, Float, ForeignKey, SmallInteger, String, Time, true
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
    __tablename__ = "eventos_rutina"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    rutina_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rutinas.id", ondelete="CASCADE"), index=True)
    ejecutado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    resultado: Mapped[str] = mapped_column(String(40))
    kwh_evitados: Mapped[float | None] = mapped_column(Float)  # estimado
