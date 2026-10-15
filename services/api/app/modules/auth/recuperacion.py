"""Códigos por correo: recuperar la contraseña y verificar el correo.

Un código de 6 dígitos por persona y propósito (el nuevo reemplaza al anterior), con su hash, vence a los 15 minutos, sirve una vez
y se bloquea tras 5 intentos fallidos. Pedirlo tiene límites por correo y por origen. Recuperar la contraseña responde igual exista o no
el correo (no revela quién tiene cuenta) y, al cambiarla, cierra las demás sesiones."""
import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import hash_contrasena
from app.integrations.correo import cliente as correo
from app.modules.agentes.service import LimitadorIntentos
from app.modules.auth.models import CodigoCorreo, Usuario

VIGENCIA = timedelta(minutes=15)
INTENTOS_MAXIMOS = 5
PEDIDOS_POR_CORREO_POR_HORA = 3
PEDIDOS_POR_ORIGEN_POR_HORA = 10
MENSAJE_CODIGO_MALO = "Ese código no es válido o ya venció. Pide uno nuevo."

limitador = LimitadorIntentos(ventana_s=3600.0)

TEXTOS = {
    "recuperar": ("Tu código para recuperar la contraseña", "Usa este código para elegir una contraseña nueva en «Apague y vámonos»"),
    "verificar": ("Tu código para verificar el correo", "Usa este código para verificar tu correo en «Apague y vámonos»"),
}


def _hash(usuario_id: uuid.UUID, proposito: str, codigo: str) -> str:
    return hashlib.sha256(f"{usuario_id}:{proposito}:{codigo}".encode()).hexdigest()


def _mensaje(usuario: Usuario, proposito: str, codigo: str) -> correo.Mensaje:
    asunto, frase = TEXTOS[proposito]
    texto = (
        f"Hola {usuario.nombre.split()[0]},\n\n{frase}:\n\n    {codigo}\n\n"
        f"Vale 15 minutos y sirve una sola vez. Si no lo pediste tú, ignora este correo: nadie puede entrar a tu cuenta solo con él.\n\n"
        "Apague y vámonos"
    )
    html = (
        f"<p>Hola {usuario.nombre.split()[0]},</p><p>{frase}:</p>"
        f'<p style="font-size:32px;font-weight:700;letter-spacing:6px">{codigo}</p>'
        "<p>Vale 15 minutos y sirve una sola vez. Si no lo pediste tú, ignora este correo: nadie puede entrar a tu cuenta solo con él.</p>"
        "<p>Apague y vámonos</p>"
    )
    return correo.Mensaje(para=usuario.email, asunto=asunto, texto=texto, html=html)


def emitir_codigo(db: Session, usuario: Usuario, proposito: str, ahora: datetime | None = None) -> correo.Mensaje:
    """Guarda un código nuevo (reemplaza el vigente) y devuelve el correo listo para enviar."""
    ahora = ahora or datetime.now(UTC)
    codigo = f"{secrets.randbelow(10**6):06d}"
    db.execute(delete(CodigoCorreo).where(CodigoCorreo.usuario_id == usuario.id, CodigoCorreo.proposito == proposito))
    db.add(CodigoCorreo(usuario_id=usuario.id, proposito=proposito, codigo_hash=_hash(usuario.id, proposito, codigo), expira_en=ahora + VIGENCIA))
    db.commit()
    return _mensaje(usuario, proposito, codigo)


def permitir_pedido(email: str, origen: str) -> bool:
    return limitador.permitir(f"correo:{email}", PEDIDOS_POR_CORREO_POR_HORA) and limitador.permitir(f"origen:{origen}", PEDIDOS_POR_ORIGEN_POR_HORA)


def pedir_recuperacion(db: Session, email: str, origen: str) -> correo.Mensaje | None:
    """El correo a enviar, o None si no hay que enviar nada (no existe la cuenta, o se pasó del límite). La respuesta a la persona es la misma."""
    email = email.lower()
    if not permitir_pedido(email, origen):
        return None
    usuario = db.scalar(select(Usuario).where(Usuario.email == email))
    return emitir_codigo(db, usuario, "recuperar") if usuario else None


def verificar_codigo(db: Session, usuario: Usuario, proposito: str, codigo: str, ahora: datetime | None = None) -> None:
    """Consume el código si es el correcto. Lanza 400 (siempre el mismo mensaje) si no hay código, venció, se bloqueó o no coincide."""
    ahora = ahora or datetime.now(UTC)
    fila = db.scalar(select(CodigoCorreo).where(CodigoCorreo.usuario_id == usuario.id, CodigoCorreo.proposito == proposito))
    if fila is None or fila.expira_en < ahora or fila.intentos >= INTENTOS_MAXIMOS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, MENSAJE_CODIGO_MALO)
    if not secrets.compare_digest(fila.codigo_hash, _hash(usuario.id, proposito, codigo)):
        fila.intentos += 1
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, MENSAJE_CODIGO_MALO)
    db.delete(fila)
    db.commit()


def restablecer_contrasena(db: Session, email: str, codigo: str, contrasena_nueva: str, ahora: datetime | None = None) -> None:
    usuario = db.scalar(select(Usuario).where(Usuario.email == email.lower()))
    if usuario is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, MENSAJE_CODIGO_MALO)  # igual que un código malo: no se revela si existe
    verificar_codigo(db, usuario, "recuperar", codigo, ahora)
    usuario.hash_contrasena = hash_contrasena(contrasena_nueva)
    usuario.version_sesion += 1  # las sesiones abiertas (por ejemplo, en un teléfono perdido) dejan de servir
    if usuario.email_verificado_en is None:
        usuario.email_verificado_en = ahora or datetime.now(UTC)  # recibió el código en ese correo: queda comprobado
    db.commit()


def verificar_correo(db: Session, usuario: Usuario, codigo: str) -> None:
    verificar_codigo(db, usuario, "verificar", codigo)
    usuario.email_verificado_en = datetime.now(UTC)
    db.commit()
