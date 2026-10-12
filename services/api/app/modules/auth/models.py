import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, nuevo_id


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    # Sin contraseña si la cuenta se creó solo con Google.
    hash_contrasena: Mapped[str | None] = mapped_column(String(255))
    # Identificador estable de la cuenta de Google ("sub"); el correo puede cambiar, este no.
    google_sub: Mapped[str | None] = mapped_column(String(64), unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    # Ley 1581 de 2012: fecha en que aceptó el tratamiento de datos. Nulo = aún no lo acepta (cuenta nueva de Google):
    # hasta entonces la API no le entrega ni guarda datos del hogar.
    consentimiento_datos_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
