import asyncio
import uuid
from collections import defaultdict

from fastapi import WebSocket


class GestorConexiones:
    """Conexiones WebSocket de la app por hogar (en memoria: un solo proceso, como en Render gratuito)."""

    def __init__(self) -> None:
        self._por_hogar: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)

    def conectar(self, hogar_id: uuid.UUID, ws: WebSocket) -> None:
        self._por_hogar[hogar_id].add(ws)

    def desconectar(self, hogar_id: uuid.UUID, ws: WebSocket) -> None:
        self._por_hogar[hogar_id].discard(ws)
        if not self._por_hogar[hogar_id]:
            del self._por_hogar[hogar_id]

    async def publicar(self, hogar_id: uuid.UUID, eventos: list[dict]) -> None:
        for evento in eventos:
            await asyncio.gather(
                *(self._enviar(hogar_id, ws, evento) for ws in list(self._por_hogar.get(hogar_id, ()))),
            )

    async def _enviar(self, hogar_id: uuid.UUID, ws: WebSocket, evento: dict) -> None:
        try:
            await ws.send_json(evento)
        except Exception:  # conexión caída: se descarta; la app reconecta con espera creciente
            self._por_hogar.get(hogar_id, set()).discard(ws)


gestor = GestorConexiones()
