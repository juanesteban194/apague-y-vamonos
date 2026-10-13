import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class PrepagoSaldo(Base):
    __tablename__ = "prepago_saldos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    hogar_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hogares.id", ondelete="CASCADE"), index=True)
    saldo_cop: Mapped[float] = mapped_column(Numeric(12, 2))
    registrado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
