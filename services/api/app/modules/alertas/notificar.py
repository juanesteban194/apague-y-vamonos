"""Entrega de los avisos nuevos: evento `alerta` por WebSocket a la app abierta (y, más adelante, push)."""
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.modules.alertas import reglas
from app.modules.alertas.models import Alerta
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


def notificar(db: Session, alertas: list[Alerta]) -> None:
    for alerta in alertas:
        gestor.publicar_desde_hilo(alerta.hogar_id, [evento_alerta(alerta)])
        log.info("aviso %s/%s: %s", alerta.tipo, alerta.nivel, alerta.titulo)


def evaluar_y_notificar(db: Session, ahora: datetime) -> int:
    """Tarea de cada minuto (CLAUDE.md: el aviso debe llegar ≤ 60 s después de cruzar el umbral)."""
    nuevas = reglas.evaluar_todo(db, ahora)
    notificar(db, nuevas)
    return len(nuevas)
