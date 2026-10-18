import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class Dispositivo(Base):
    __tablename__ = "dispositivos"
    __table_args__ = (UniqueConstraint("hogar_id", "tuya_id", name="uq_dispositivos_hogar_tuya"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    hogar_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hogares.id", ondelete="CASCADE"), index=True)
    # ID de Tuya (no es secreto). La clave local no va en esta tabla (ver ADR 0008).
    # Único dentro de cada casa (no en todo el sistema): en las pruebas un mismo enchufe físico se registra en varias cuentas.
    tuya_id: Mapped[str] = mapped_column(String(64), index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    tipo_aparato: Mapped[str | None] = mapped_column(String(60))
    alto_riesgo: Mapped[bool] = mapped_column(Boolean, server_default=false(), default=False)
    umbral_minutos_encendido: Mapped[int | None] = mapped_column(Integer)
    # El agente que lo lee. Solo ese agente puede mandar sus lecturas y recibir sus órdenes de encender/apagar. Si el agente se elimina, queda sin agente.
    agente_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agentes.id", ondelete="SET NULL"), index=True)
    # Calibración de los vatios: las lecturas nuevas se guardan ya multiplicadas por este factor (1 = sin ajuste). Se calcula comparando lo que
    # lee el enchufe con un medidor de referencia (docs/decisiones/0012).
    factor_calibracion: Mapped[float] = mapped_column(Float, server_default="1", default=1.0)
    calibrado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    calibracion_referencia_w: Mapped[float | None] = mapped_column(Float)
    # Clave local de Tuya, cifrada (ADR 0008). Solo se entrega al agente asignado; la app nunca la recibe.
    clave_local_cifrada: Mapped[str | None] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
