from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    crear_token_acceso,
    crear_token_renovacion,
    decodificar_token,
    hash_contrasena,
    verificar_contrasena,
)
from app.modules.auth.models import Usuario
from app.modules.auth.schemas import RegistroIn, TokensOut

# Hash de relleno para que login tarde igual exista o no el correo.
_HASH_RELLENO = hash_contrasena("relleno-no-es-una-contrasena-real")


def _tokens(usuario: Usuario) -> TokensOut:
    return TokensOut(
        access_token=crear_token_acceso(usuario.id),
        refresh_token=crear_token_renovacion(usuario.id),
    )


def registrar(db: Session, datos: RegistroIn) -> Usuario:
    if not datos.acepta_tratamiento_datos:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Debes aceptar el tratamiento de datos personales (Ley 1581 de 2012)",
        )
    usuario = Usuario(
        email=datos.email.lower(),
        hash_contrasena=hash_contrasena(datos.contrasena),
        nombre=datos.nombre,
        consentimiento_datos_en=datetime.now(UTC),
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ese correo ya está registrado") from None
    return usuario


def iniciar_sesion(db: Session, email: str, contrasena: str) -> TokensOut:
    usuario = db.scalar(select(Usuario).where(Usuario.email == email.lower()))
    hash_a_verificar = usuario.hash_contrasena if usuario else _HASH_RELLENO
    if not verificar_contrasena(contrasena, hash_a_verificar) or usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    return _tokens(usuario)


def renovar(db: Session, refresh_token: str) -> TokensOut:
    usuario_id = decodificar_token(refresh_token, "refresh")
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o vencido")
    return _tokens(usuario)
