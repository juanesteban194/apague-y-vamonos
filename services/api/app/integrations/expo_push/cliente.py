"""Envío de notificaciones push por el servicio de Expo (Expo Push → FCM en Android).

Nunca lanza: una notificación que no sale no debe tumbar la tarea que evalúa los avisos (el aviso queda en la app de todos modos)."""
import logging

import httpx

from app.core.config import get_settings

log = logging.getLogger("expo_push")
URL = "https://exp.host/--/api/v2/push/send"
LOTE = 100  # máximo por petición según Expo
CANAL_ANDROID = "avisos"
CATEGORIA_APAGAR = "aviso_con_apagar"  # la app define esta categoría con el botón "Apagar"


def token_valido(token: str) -> bool:
    return (token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")) and token.endswith("]") and len(token) < 255


def enviar(mensajes: list[dict], cliente: httpx.Client | None = None) -> list[str]:
    """Envía los mensajes y devuelve los tokens que Expo dice que ya no existen (DeviceNotRegistered), para borrarlos."""
    muertos: list[str] = []
    cabeceras = {"Accept": "application/json", "Content-Type": "application/json"}
    token = get_settings().expo_access_token
    if token:
        cabeceras["Authorization"] = f"Bearer {token}"
    propio = cliente is None
    cliente = cliente or httpx.Client(timeout=15)
    try:
        for i in range(0, len(mensajes), LOTE):
            lote = mensajes[i : i + LOTE]
            try:
                r = cliente.post(URL, headers=cabeceras, json=lote)
                r.raise_for_status()
                tickets = r.json().get("data", [])
            except (httpx.HTTPError, ValueError) as e:
                log.warning("no se pudieron enviar %d notificaciones push: %s", len(lote), type(e).__name__)
                continue
            for mensaje, ticket in zip(lote, tickets):
                if ticket.get("status") == "error":
                    if (ticket.get("details") or {}).get("error") == "DeviceNotRegistered":
                        muertos.append(mensaje["to"])
                    else:
                        log.warning("Expo rechazó una notificación: %s", ticket.get("message"))
    finally:
        if propio:
            cliente.close()
    return muertos
