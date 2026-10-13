"""Conexiones WebSocket de los agentes locales (/ws/agente) y envío de comandos a ellos.

Un hogar puede tener varios agentes conectados; el comando se manda a todos (cada uno solo actúa sobre sus enchufes) y se da por
hecho con la primera respuesta exitosa, o fallido cuando todos respondieron que no pudieron."""
import asyncio
import uuid
from dataclasses import dataclass
from typing import Literal

from fastapi import WebSocket

Accion = Literal["encender", "apagar"]


@dataclass
class ResultadoComando:
    ok: bool
    detalle: str | None = None


class GestorAgentes:
    def __init__(self) -> None:
        self._por_hogar: dict[uuid.UUID, dict[uuid.UUID, WebSocket]] = {}
        self._pendientes: dict[str, tuple[asyncio.Future[ResultadoComando], list[int]]] = {}  # id → (futuro, [faltan])

    def conectar(self, hogar_id: uuid.UUID, agente_id: uuid.UUID, ws: WebSocket) -> None:
        self._por_hogar.setdefault(hogar_id, {})[agente_id] = ws

    def desconectar(self, hogar_id: uuid.UUID, agente_id: uuid.UUID, ws: WebSocket) -> None:
        conexiones = self._por_hogar.get(hogar_id, {})
        if conexiones.get(agente_id) is ws:
            del conexiones[agente_id]
        if not conexiones:
            self._por_hogar.pop(hogar_id, None)

    def hay_agente(self, hogar_id: uuid.UUID) -> bool:
        return bool(self._por_hogar.get(hogar_id))

    async def enviar(self, hogar_id: uuid.UUID, tuya_id: str, accion: Accion, espera_s: float = 8.0) -> ResultadoComando | None:
        """None si no hay ningún agente conectado (el llamador decide si usa el respaldo)."""
        conexiones = list(self._por_hogar.get(hogar_id, {}).values())
        if not conexiones:
            return None
        id_comando = uuid.uuid4().hex
        futuro: asyncio.Future[ResultadoComando] = asyncio.get_running_loop().create_future()
        faltan = [0]
        self._pendientes[id_comando] = (futuro, faltan)
        mensaje = {"tipo": "comando", "id": id_comando, "tuya_id": tuya_id, "accion": accion}
        for ws in conexiones:
            try:
                await ws.send_json(mensaje)
                faltan[0] += 1
            except Exception:  # conexión caída: ese agente ya no cuenta
                continue
        try:
            if faltan[0] == 0:
                return None
            return await asyncio.wait_for(futuro, espera_s)
        except TimeoutError:
            return ResultadoComando(False, "El agente de tu casa no respondió a tiempo")
        finally:
            self._pendientes.pop(id_comando, None)

    def resolver(self, id_comando: str, ok: bool, detalle: str | None) -> None:
        pendiente = self._pendientes.get(id_comando)
        if pendiente is None:
            return
        futuro, faltan = pendiente
        faltan[0] -= 1
        if futuro.done():
            return
        if ok:
            futuro.set_result(ResultadoComando(True))
        elif faltan[0] <= 0:  # todos respondieron que no
            futuro.set_result(ResultadoComando(False, detalle or "El agente no pudo ejecutar el comando"))


gestor_agentes = GestorAgentes()
