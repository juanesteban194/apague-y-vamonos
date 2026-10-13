"""Entrega de los avisos nuevos: evento `alerta` por WebSocket a la app abierta (y, más adelante, push)."""
import logging
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.integrations.expo_push import cliente as expo_push
from app.modules.alertas import reglas
from app.modules.alertas.models import Alerta, TokenPush
from app.modules.hogares.models import MiembroHogar
from app.realtime.manager import gestor

log = logging.getLogger("alertas")


def evento_alerta(alerta: Alerta) -> dict:
    return {
        "tipo": "alerta",
        "id": str(alerta.id),
        "dispositivo_id": str(alerta.dispositivo_id) if alerta.dispositivo_id else None,
        "alerta_tipo": alerta.tipo,
        "nivel": alerta.nivel,
        "titulo": alerta.titulo,
        "mensaje": alerta.mensaje,
        "fecha": alerta.fecha.isoformat(),
    }


def mensaje_push(alerta: Alerta, token: str) -> dict:
    datos = {"alerta_id": str(alerta.id), "tipo": alerta.tipo, "nivel": alerta.nivel}
    if alerta.dispositivo_id:
        datos["dispositivo_id"] = str(alerta.dispositivo_id)
    return {
        "to": token,
        "title": alerta.titulo,
        "body": alerta.mensaje,
        "sound": "default",
        "priority": "high" if alerta.nivel == "rojo" else "default",
        "channelId": expo_push.CANAL_ANDROID,
        # Con un aparato de por medio, la notificación trae el botón "Apagar" (alto riesgo, rutinas).
        **({"categoryId": expo_push.CATEGORIA_APAGAR} if alerta.dispositivo_id and alerta.tipo == "alto_riesgo" else {}),
        "data": datos,
    }


def enviar_push(db: Session, alertas: list[Alerta]) -> None:
    """Push a todos los miembros del hogar que tengan el celular registrado. Los tokens que Expo da por muertos se borran."""
    mensajes = []
    for alerta in alertas:
        tokens = db.scalars(select(TokenPush.token_expo).join(MiembroHogar, MiembroHogar.usuario_id == TokenPush.usuario_id).where(MiembroHogar.hogar_id == alerta.hogar_id))
        mensajes += [mensaje_push(alerta, t) for t in tokens]
    if not mensajes:
        return
    muertos = expo_push.enviar(mensajes)
    if muertos:
        db.execute(delete(TokenPush).where(TokenPush.token_expo.in_(muertos)))
        db.commit()


def notificar(db: Session, alertas: list[Alerta]) -> None:
    for alerta in alertas:
        gestor.publicar_desde_hilo(alerta.hogar_id, [evento_alerta(alerta)])
        log.info("aviso %s/%s: %s", alerta.tipo, alerta.nivel, alerta.titulo)
    try:
        enviar_push(db, alertas)
    except Exception:
        log.exception("falló el envío de notificaciones push (los avisos siguen en la app)")


def evaluar_y_notificar(db: Session, ahora: datetime) -> int:
    """Tarea de cada minuto (CLAUDE.md: el aviso debe llegar ≤ 60 s después de cruzar el umbral)."""
    nuevas = reglas.evaluar_todo(db, ahora)
    notificar(db, nuevas)
    return len(nuevas)
