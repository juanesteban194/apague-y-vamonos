"""Envía a la API las lecturas de la cola, en orden, y las borra solo cuando la API confirmó su recepción."""
import logging

import httpx

from agent.buffer.cola import Cola

log = logging.getLogger("agente.enviador")

TAMANO_LOTE = 500  # la API acepta hasta 1000 por petición


class ErrorRed(Exception):
    """Sin conexión, tiempo agotado o error del servidor: las lecturas siguen en la cola y se reintenta."""


class ErrorAutenticacion(Exception):
    """El token del agente no es válido (401): reintentar no sirve hasta corregirlo."""


class Enviador:
    def __init__(self, cola: Cola, cliente: httpx.Client, lote: int = TAMANO_LOTE):
        self._cola = cola
        self._cliente = cliente
        self._lote = lote

    def enviar_lote(self) -> int:
        """Envía hasta un lote. Devuelve cuántas lecturas salieron de la cola (0 si estaba vacía)."""
        filas = self._cola.siguientes(self._lote)
        if not filas:
            return 0
        respuesta = self._post([lectura for _, lectura in filas])
        if respuesta.status_code == 422:
            return self._descartar_invalidas(filas)
        self._validar(respuesta)
        desconocidas = respuesta.json().get("desconocidas", 0)
        if desconocidas:
            log.warning("La API no reconoce %d lecturas (¿el enchufe está registrado en el hogar?)", desconocidas)
        self._cola.borrar([i for i, _ in filas])
        return len(filas)

    def _post(self, lecturas: list[dict]) -> httpx.Response:
        try:
            return self._cliente.post("/ingesta/lecturas", json={"lecturas": lecturas})
        except httpx.HTTPError as e:
            raise ErrorRed(f"{type(e).__name__}: {e}") from None

    @staticmethod
    def _validar(respuesta: httpx.Response) -> None:
        if respuesta.status_code == 401:
            raise ErrorAutenticacion("token de agente inválido")
        if respuesta.status_code != 200:
            raise ErrorRed(f"HTTP {respuesta.status_code}")  # 5xx, 429 o una URL mal puesta: se conserva todo

    def _descartar_invalidas(self, filas: list[tuple[int, dict]]) -> int:
        """La API rechazó el lote por datos inválidos: se prueba una por una para no atascar la cola con una sola mala."""
        quitadas = 0
        for id_, lectura in filas:
            respuesta = self._post([lectura])
            if respuesta.status_code == 422:
                log.warning("Lectura inválida descartada: %s", lectura)
            else:
                self._validar(respuesta)
            self._cola.borrar([id_])
            quitadas += 1
        return quitadas
