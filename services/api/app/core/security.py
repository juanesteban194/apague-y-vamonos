import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)
ALGORITMO = "HS256"


def hash_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar_contrasena(contrasena: str, hash_guardado: str) -> bool:
    try:
        return _hasher.verify(hash_guardado, contrasena)
    except (VerifyMismatchError, InvalidHashError):
        return False


def _crear_token(usuario_id: UUID, tipo: str, vigencia: timedelta) -> str:
    ahora = datetime.now(UTC)
    claims = {"sub": str(usuario_id), "type": tipo, "iat": ahora, "exp": ahora + vigencia}
    return jwt.encode(claims, get_settings().jwt_secret, algorithm=ALGORITMO)


def crear_token_acceso(usuario_id: UUID) -> str:
    return _crear_token(usuario_id, "access", timedelta(minutes=get_settings().jwt_access_minutes))


def crear_token_renovacion(usuario_id: UUID) -> str:
    return _crear_token(usuario_id, "refresh", timedelta(days=get_settings().jwt_refresh_days))


def decodificar_token(token: str, tipo: str) -> UUID:
    """Devuelve el id de usuario o lanza 401 si el token es inválido, vencido o de otro tipo."""
    try:
        claims = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITMO])
        if claims.get("type") != tipo:
            raise jwt.InvalidTokenError("tipo de token incorrecto")
        return UUID(claims["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o vencido") from None


def generar_token_agente() -> str:
    return secrets.token_urlsafe(32)


def hash_token_agente(token: str) -> str:
    # El token ya es aleatorio de alta entropía: SHA-256 basta (Argon2 es para contraseñas).
    return hashlib.sha256(token.encode()).hexdigest()


def usuario_actual_id(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> UUID:
    if credenciales is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token de acceso")
    return decodificar_token(credenciales.credentials, "access")


def token_bearer(credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    if credenciales is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token")
    return credenciales.credentials
