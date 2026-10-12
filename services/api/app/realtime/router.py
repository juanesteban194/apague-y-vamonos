import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.core.database import get_sessionmaker
from app.core.security import decodificar_token
from app.modules.hogares.models import MiembroHogar
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
