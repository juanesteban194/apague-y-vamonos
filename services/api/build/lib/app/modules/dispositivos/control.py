"""Encender y apagar un enchufe desde la app (HU-02, HU-08). La app nunca habla con Tuya: todo pasa por aquí.

Vía principal: el agente local por WebSocket (LAN, rápido y gratis). Respaldo: la API de Tuya Cloud, solo si el agente no
está conectado, no responde o no pudo, y con tope mensual de llamadas para no gastar la cuota."""
import time
import uuid
from collections import defaultdict, deque
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.database import get_sessionmaker
from app.integrations.tuya_cloud.cliente import ErrorTuyaCloud, cliente_tuya
from app.modules.auth.dependencias import usuario_con_consentimiento
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.service import exigir_miembro
from app.realtime.agentes import Accion, gestor_agentes

router = APIRouter(prefix="/dispositivos", tags=["control"])


class ComandoOut(BaseModel):
    dispositivo_id: uuid.UUID
    encendido: bool
    via: Literal["agente", "nube"]


class LimitadorComandos:
    """Ventana deslizante de 60 s por enchufe: evita que un toque repetido (o un bucle) sature el enchufe o la cuota de Tuya."""

    def __init__(self, ventana_s: float = 60.0):
        self._ventana = ventana_s
        self._marcas: dict[uuid.UUID, deque[float]] = defaultdict(deque)

    def permitir(self, clave: uuid.UUID, maximo: int) -> bool:
        ahora = time.monotonic()
        marcas = self._marcas[clave]
        while marcas and ahora - marcas[0] > self._ventana:
            marcas.popleft()
        if len(marcas) >= maximo:
            return False
        marcas.append(ahora)
        return True


limitador = LimitadorComandos()


def _autorizar(dispositivo_id: uuid.UUID, usuario_id: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID, str]:
    with get_sessionmaker()() as db:
        d = db.get(Dispositivo, dispositivo_id)
        if d is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Dispositivo no encontrado")
        exigir_miembro(db, usuario_id, d.hogar_id)  # cualquier miembro del hogar puede prender o apagar
        return d.id, d.hogar_id, d.tuya_id


async def ejecutar_comando(hogar_id: uuid.UUID, dispositivo_id: uuid.UUID, tuya_id: str, accion: Accion) -> ComandoOut:
    """Agente primero; si falla, el respaldo por la nube. Lanza HTTPException 503 si ninguna vía funcionó."""
    encender = accion == "encender"
    motivo = "no hay un agente conectado en tu casa"
    resultado = await gestor_agentes.enviar(hogar_id, tuya_id, accion)
    if resultado is not None and resultado.ok:
        return ComandoOut(dispositivo_id=dispositivo_id, encendido=encender, via="agente")
    if resultado is not None:
        motivo = resultado.detalle or "el agente no pudo ejecutar el comando"
    if cliente_tuya.configurado():
        try:
            await cliente_tuya.enviar_comando(tuya_id, encender)
            return ComandoOut(dispositivo_id=dispositivo_id, encendido=encender, via="nube")
        except ErrorTuyaCloud as e:
            motivo = f"{motivo}; el respaldo por la nube también falló ({e})"
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"No se pudo {accion} el aparato: {motivo}.")


async def _comandar(dispositivo_id: uuid.UUID, accion: Accion, usuario_id: uuid.UUID) -> ComandoOut:
    d_id, hogar_id, tuya_id = await run_in_threadpool(_autorizar, dispositivo_id, usuario_id)
    if not limitador.permitir(d_id, get_settings().comandos_max_por_minuto):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados cambios seguidos. Espera un momento e intenta de nuevo.")
    return await ejecutar_comando(hogar_id, d_id, tuya_id, accion)


@router.post("/{dispositivo_id}/encender", response_model=ComandoOut)
async def encender(dispositivo_id: uuid.UUID, usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    return await _comandar(dispositivo_id, "encender", usuario_id)


@router.post("/{dispositivo_id}/apagar", response_model=ComandoOut)
async def apagar(dispositivo_id: uuid.UUID, usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    return await _comandar(dispositivo_id, "apagar", usuario_id)
