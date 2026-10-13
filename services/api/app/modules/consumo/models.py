import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Numeric, String, UniqueConstraint, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class ConsumoHorario(Base):
    """Consolidado por hora; se guarda siempre (las lecturas crudas se purgan a los 30 días)."""

    __tablename__ = "consumo_horario"

    dispositivo_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("dispositivos.id", ondelete="CASCADE"), primary_key=True
    )
    hora: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    kwh: Mapped[float] = mapped_column(Float)
    # Nulo si cuando se consolidó la hora aún no había tarifa cargada: se corrige en la siguiente pasada.
    costo_cop: Mapped[float | None] = mapped_column(Numeric(12, 2))


class Equivalencia(Base):
    __tablename__ = "equivalencias"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    nombre: Mapped[str] = mapped_column(String(120))
    costo_cop: Mapped[float] = mapped_column(Numeric(12, 2))
    icono: Mapped[str] = mapped_column(String(60))
    vigente_desde: Mapped[date] = mapped_column(Date)


class HistorialFactura(Base):
    """Un mes del histórico de consumo que EPM imprime en la factura (CLAUDE.md: objetivo del producto). El promedio de estos meses es el
    "consumo normal" contra el que se mide el ahorro."""

    __tablename__ = "historial_facturas"
    __table_args__ = (UniqueConstraint("hogar_id", "mes", name="un_mes_por_hogar"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    hogar_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hogares.id", ondelete="CASCADE"), index=True)
    mes: Mapped[date] = mapped_column(Date)  # primer día del mes facturado
    kwh: Mapped[float] = mapped_column(Float)
    valor_cop: Mapped[float | None] = mapped_column(Numeric(12, 2))  # lo pagado ese mes, si lo anotó
