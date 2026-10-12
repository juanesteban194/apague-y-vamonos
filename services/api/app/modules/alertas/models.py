import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, Text, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class Alerta(Base):
    __tablename__ = "alertas"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    hogar_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hogares.id", ondelete="CASCADE"), index=True)
    dispositivo_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("dispositivos.id", ondelete="SET NULL")
    )
    tipo: Mapped[str] = mapped_column(String(40))
    nivel: Mapped[str] = mapped_column(String(20))
    mensaje: Mapped[str] = mapped_column(Text)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    leida: Mapped[bool] = mapped_column(Boolean, server_default=false(), default=False)


class PreferenciaAlertas(Base):
    __tablename__ = "preferencias_alertas"
    __table_args__ = (
        CheckConstraint("sensibilidad IN ('pocos', 'normal', 'todos')", name="sensibilidad_valida"),
    )

    hogar_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("hogares.id", ondelete="CASCADE"), primary_key=True
    )
    sensibilidad: Mapped[str] = mapped_column(String(10), server_default="normal", default="normal")


class TokenPush(Base):
    __tablename__ = "tokens_push"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    token_expo: Mapped[str] = mapped_column(String(255), unique=True)
    plataforma: Mapped[str] = mapped_column(String(20))
