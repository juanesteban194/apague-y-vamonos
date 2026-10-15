import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
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
    # Cuándo se comprobó que el correo es de la persona (código por correo o cuenta de Google). Nulo = sin verificar; no bloquea nada.
    email_verificado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Sube al restablecer la contraseña: los tokens llevan la versión con la que se emitieron y los de versiones anteriores dejan de servir.
    version_sesion: Mapped[int] = mapped_column(Integer, server_default="0", default=0)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CodigoCorreo(Base):
    """Código de 6 dígitos enviado por correo (recuperar la contraseña o verificar el correo). Uno vigente por persona y propósito;
    se guarda su hash, vence a los 15 minutos, sirve una vez y se bloquea tras 5 intentos fallidos."""

    __tablename__ = "codigos_correo"
    __table_args__ = (UniqueConstraint("usuario_id", "proposito", name="uq_codigo_correo_usuario_proposito"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=nuevo_id)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    proposito: Mapped[str] = mapped_column(String(20))  # recuperar | verificar
    codigo_hash: Mapped[str] = mapped_column(String(64))
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    intentos: Mapped[int] = mapped_column(Integer, server_default="0", default=0)
