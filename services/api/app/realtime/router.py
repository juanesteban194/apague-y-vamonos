import asyncio
import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from sqlalchemy import select

from app.core.database import get_sessionmaker
from app.core.security import decodificar_token, hash_token_agente
from app.modules.hogares.models import Agente, MiembroHogar
from app.realtime.agentes import gestor_agentes
from app.realtime.manager import gestor

router = APIRouter(tags=["tiempo real"])

CIERRE_NO_AUTENTICADO = 4401
CIERRE_SIN_ACCESO = 4403
ESPERA_AUTENTICACION_S = 5


def _es_miembro(usuario_id: uuid.UUID, hogar_id: uuid.UUID) -> bool:
    with get_sessionmaker()() as db:
        return db.get(MiembroHogar, (usuario_id, hogar_id)) is not None


@router.websocket("/ws/hogares/{hogar_id}")
async def ws_hogar(ws: WebSocket, hogar_id: uuid.UUID):
    """Eventos en vivo del hogar: `lectura`, `estado_enchufe` (y `alerta` en la Fase 4).

    El token no va en la URL (queda en registros): el primer mensaje debe ser {"token": "<acceso>"}.
    """
    await ws.accept()
    try:
        primer = await asyncio.wait_for(ws.receive_json(), timeout=ESPERA_AUTENTICACION_S)
        usuario_id = decodificar_token(primer["token"], "access")
    except Exception:
        await ws.close(code=CIERRE_NO_AUTENTICADO)
        return
    if not await run_in_threadpool(_es_miembro, usuario_id, hogar_id):
        await ws.close(code=CIERRE_SIN_ACCESO)
        return

    gestor.conectar(hogar_id, ws)
    try:
        await ws.send_json({"tipo": "conectado"})
        while True:
            if await ws.receive_text() == "ping":  # para mantener viva la conexión tras el proxy
                await ws.send_json({"tipo": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        gestor.desconectar(hogar_id, ws)


def _autenticar_agente(token: str) -> tuple[uuid.UUID, uuid.UUID] | None:
    with get_sessionmaker()() as db:
        agente = db.scalar(select(Agente).where(Agente.token_hash == hash_token_agente(token)))
        if agente is None:
            return None
        agente.ultima_conexion = datetime.now(UTC)
        db.commit()
        return agente.id, agente.hogar_id


@router.websocket("/ws/agente")
async def ws_agente(ws: WebSocket):
    """Canal del agente local: la API le manda comandos (encender/apagar) y él responde con el resultado.
    Igual que en la app, el token va en el primer mensaje: {"token": "<token del agente>"}."""
    await ws.accept()
    try:
        primer = await asyncio.wait_for(ws.receive_json(), timeout=ESPERA_AUTENTICACION_S)
        ids = await run_in_threadpool(_autenticar_agente, primer["token"])
    except Exception:
        ids = None
    if ids is None:
        await ws.close(code=CIERRE_NO_AUTENTICADO)
        return
    agente_id, hogar_id = ids
    gestor_agentes.conectar(hogar_id, agente_id, ws)
    try:
        await ws.send_json({"tipo": "conectado"})
        while True:
            texto = await ws.receive_text()
            if texto == "ping":
                await ws.send_json({"tipo": "pong"})
                continue
            try:
                mensaje = json.loads(texto)
            except ValueError:
                continue
            if mensaje.get("tipo") == "resultado" and isinstance(mensaje.get("id"), str):
                gestor_agentes.resolver(mensaje["id"], bool(mensaje.get("ok")), mensaje.get("error"))
    except WebSocketDisconnect:
        pass
    finally:
        gestor_agentes.desconectar(hogar_id, agente_id, ws)
