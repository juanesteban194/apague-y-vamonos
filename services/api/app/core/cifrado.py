"""Cifrado de secretos guardados en la base (hoy: la clave local de cada enchufe, ADR 0008).

La clave maestra vive solo en la variable de entorno CLAVE_MAESTRA del backend. Puede ser cualquier texto largo: se deriva una clave
Fernet (AES-128-CBC + HMAC) con SHA-256. Quien lea la base sin esa variable no puede abrir las claves."""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


class ErrorCifrado(Exception):
    pass


def _fernet() -> Fernet:
    maestra = get_settings().clave_maestra
    if not maestra:
        raise ErrorCifrado("Falta CLAVE_MAESTRA en el backend: no se pueden guardar ni leer claves de enchufes")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(maestra.encode()).digest()))


def disponible() -> bool:
    return bool(get_settings().clave_maestra)


def cifrar(texto: str) -> str:
    return _fernet().encrypt(texto.encode()).decode()


def descifrar(cifrado: str) -> str:
    try:
        return _fernet().decrypt(cifrado.encode()).decode()
    except InvalidToken:
        raise ErrorCifrado("No se pudo descifrar: la CLAVE_MAESTRA cambió o el dato está dañado") from None
