"""Envío de correos por la API HTTP de Brevo (el plan gratuito de Render bloquea el SMTP). Sin clave configurada no se envía nada.

Nunca lanza: un correo que no sale no debe romper el registro ni dejar a nadie sin respuesta; el llamador decide qué decir."""
import logging
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

log = logging.getLogger("correo")
URL_BREVO = "https://api.brevo.com/v3/smtp/email"


@dataclass(frozen=True)
class Mensaje:
    para: str
    asunto: str
    texto: str
    html: str | None = None


def configurado() -> bool:
    s = get_settings()
    return bool(s.brevo_api_key and s.correo_remitente_email)


def enviar(mensaje: Mensaje, cliente: httpx.Client | None = None) -> bool:
    """True si el proveedor aceptó el mensaje."""
    s = get_settings()
    if s.correo_consola:
        log.warning("CORREO (consola, solo desarrollo) a %s — %s\n%s", mensaje.para, mensaje.asunto, mensaje.texto)
        return True
    if not configurado():
        log.warning("No se envió el correo a %s: falta BREVO_API_KEY o CORREO_REMITENTE_EMAIL", mensaje.para)
        return False
    cuerpo = {
        "sender": {"name": s.correo_remitente_nombre, "email": s.correo_remitente_email},
        "to": [{"email": mensaje.para}],
        "subject": mensaje.asunto,
        "textContent": mensaje.texto,
        **({"htmlContent": mensaje.html} if mensaje.html else {}),
    }
    propio = cliente is None
    cliente = cliente or httpx.Client(timeout=10)
    try:
        r = cliente.post(URL_BREVO, headers={"api-key": s.brevo_api_key, "accept": "application/json"}, json=cuerpo)
    except httpx.HTTPError as e:
        log.warning("No se pudo enviar el correo a %s: %s", mensaje.para, type(e).__name__)
        return False
    finally:
        if propio:
            cliente.close()
    if r.status_code >= 300:
        log.warning("Brevo rechazó el correo a %s (HTTP %s): %s", mensaje.para, r.status_code, r.text[:200])
        return False
    return True
