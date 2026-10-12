import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class Hogar(Base):
    __tablename__ = "hogares"
    __table_args__ = (CheckConstraint("estrato BETWEEN 1 AND 6", name="estrato_valido"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    nombre: Mapped[str] = mapped_column(String(120))
    barrio: Mapped[str | None] = mapped_column(String(120))
    estrato: Mapped[int] = mapped_column(SmallInteger)
    tipo_medidor: Mapped[str | None] = mapped_column(String(30))
    limite_subsistencia_kwh: Mapped[float] = mapped_column(Numeric(6, 1), default=130)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MiembroHogar(Base):
    __tablename__ = "miembros_hogar"
    __table_args__ = (CheckConstraint("rol IN ('titular', 'familiar')", name="rol_valido"),)

    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True
    )
    hogar_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("hogares.id", ondelete="CASCADE"), primary_key=True
    )
    rol: Mapped[str] = mapped_column(String(20))


class Agente(Base):
    __tablename__ = "agentes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    hogar_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hogares.id", ondelete="CASCADE"), index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    ultima_conexion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LecturaMedidor(Base):
    """Lectura manual del medidor EPM (HU-07)."""

    __tablename__ = "lecturas_medidor"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    hogar_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hogares.id", ondelete="CASCADE"), index=True)
    lectura_kwh: Mapped[float] = mapped_column(Float)
    fecha: Mapped[date] = mapped_column(Date)
