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
from app.modules.auth.google import PerfilGoogle
from app.modules.auth.schemas import PerfilOut, RegistroIn, TokensOut

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
    # Una cuenta creada solo con Google no tiene contraseña: falla igual que una clave incorrecta (sin revelar que existe).
    hash_a_verificar = usuario.hash_contrasena if usuario and usuario.hash_contrasena else _HASH_RELLENO
    if not verificar_contrasena(contrasena, hash_a_verificar) or usuario is None or not usuario.hash_contrasena:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    return _tokens(usuario)


def renovar(db: Session, refresh_token: str) -> TokensOut:
    usuario_id = decodificar_token(refresh_token, "refresh")
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o vencido")
    return _tokens(usuario)


def perfil_de(usuario: Usuario) -> PerfilOut:
    return PerfilOut(
        id=usuario.id,
        email=usuario.email,
        nombre=usuario.nombre,
        tiene_consentimiento=usuario.consentimiento_datos_en is not None,
        tiene_contrasena=usuario.hash_contrasena is not None,
        tiene_google=usuario.google_sub is not None,
    )


def aceptar_consentimiento(db: Session, usuario: Usuario) -> Usuario:
    if usuario.consentimiento_datos_en is None:
        usuario.consentimiento_datos_en = datetime.now(UTC)
        db.commit()
    return usuario


def usuario_desde_google(db: Session, perfil: PerfilGoogle) -> Usuario:
    """Cuenta de Google → usuario. Si el correo ya tenía cuenta con contraseña, se vincula (Google verificó el correo);
    si no existe, se crea SIN consentimiento: la app lo pide antes de dejarla usar nada."""
    usuario = db.scalar(select(Usuario).where(Usuario.google_sub == perfil.sub))
    if usuario is None:
        usuario = db.scalar(select(Usuario).where(Usuario.email == perfil.email))
        if usuario is not None:
            usuario.google_sub = perfil.sub
        else:
            usuario = Usuario(email=perfil.email, nombre=perfil.nombre, google_sub=perfil.sub)
            db.add(usuario)
        db.commit()
    return usuario


def tokens_de(db: Session, usuario_id) -> TokensOut:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o vencido")
    return _tokens(usuario)
