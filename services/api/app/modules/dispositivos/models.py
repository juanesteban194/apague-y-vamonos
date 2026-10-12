import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class Dispositivo(Base):
    __tablename__ = "dispositivos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    hogar_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hogares.id", ondelete="CASCADE"), index=True)
    # ID de Tuya (no es secreto). La clave local NUNCA se guarda aquí: vive en el agente.
    tuya_id: Mapped[str] = mapped_column(String(64), unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    tipo_aparato: Mapped[str | None] = mapped_column(String(60))
    alto_riesgo: Mapped[bool] = mapped_column(Boolean, server_default=false(), default=False)
    umbral_minutos_encendido: Mapped[int | None] = mapped_column(Integer)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
