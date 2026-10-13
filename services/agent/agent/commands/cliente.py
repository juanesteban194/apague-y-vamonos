"""Canal de comandos con la API: recibe órdenes de encender/apagar por WebSocket y las ejecuta en el enchufe por LAN.

Es la vía principal (CLAUDE.md): rápida y sin gastar la cuota de Tuya Cloud. Reconecta solo con espera creciente."""
import json
import logging
import threading
import time

from websockets.exceptions import ConnectionClosed, WebSocketException
from websockets.sync.client import connect

from agent.collector.lector import ErrorEnchufe
from agent.config.ajustes import Ajustes

log = logging.getLogger("agente.comandos")

PING_CADA_S = 25  # mantiene viva la conexión a través del proxy de Render
ESPERA_MAXIMA_S = 10
ESPERA_TOKEN_RECHAZADO_S = 60


class TokenRechazado(Exception):
    pass


def url_del_canal(api_url: str) -> str:
    return api_url.rstrip("/").replace("https://", "wss://", 1).replace("http://", "ws://", 1) + "/ws/agente"


class ClienteComandos:
    def __init__(self, ajustes: Ajustes, lectores: list):
        self._ajustes = ajustes
        self._lectores = {l.tuya_id: l for l in lectores}
        self._ultimo_aviso = 0.0

    def correr(self, parar: threading.Event) -> None:
        espera = 1.0
        while not parar.is_set():
            try:
                self._sesion(parar)
                espera = 1.0
            except TokenRechazado:
                self._avisar(logging.ERROR, "La API rechaza el token del agente: no se recibirán comandos (revisa AGENT_TOKEN)")
                parar.wait(ESPERA_TOKEN_RECHAZADO_S)
                continue
            except (OSError, WebSocketException, TimeoutError, ValueError) as e:
                self._avisar(logging.WARNING, "Canal de comandos caído (%s: %s); reintentando", type(e).__name__, e)
            parar.wait(espera)
            espera = min(ESPERA_MAXIMA_S, espera * 2)

    def _avisar(self, nivel: int, mensaje: str, *args) -> None:
        if time.monotonic() - self._ultimo_aviso >= 30:  # no llenar el registro mientras no haya conexión
            self._ultimo_aviso = time.monotonic()
            log.log(nivel, mensaje, *args)

    def _sesion(self, parar: threading.Event) -> None:
        with connect(url_del_canal(self._ajustes.api_url), open_timeout=10, close_timeout=2) as ws:
            ws.send(json.dumps({"token": self._ajustes.token}))
            try:
                primero = json.loads(ws.recv(timeout=10))
            except ConnectionClosed as e:
                if e.rcvd and e.rcvd.code == 4401:
                    raise TokenRechazado from None
                raise
            if primero.get("tipo") != "conectado":
                raise TokenRechazado
            log.info("Canal de comandos conectado")
            ultimo_ping = time.monotonic()
            while not parar.is_set():
                try:
                    mensaje = ws.recv(timeout=1)
                except TimeoutError:
                    mensaje = None
                if mensaje:
                    self._atender(ws, mensaje)
                if time.monotonic() - ultimo_ping >= PING_CADA_S:
                    ws.send("ping")
                    ultimo_ping = time.monotonic()

    def _atender(self, ws, texto: str) -> None:
        try:
            orden = json.loads(texto)
        except ValueError:
            return
        if orden.get("tipo") != "comando":
            return  # pong y demás
        id_comando, tuya_id, accion = orden.get("id"), orden.get("tuya_id"), orden.get("accion")
        lector = self._lectores.get(tuya_id)
        if lector is None:
            return self._responder(ws, id_comando, False, "ese enchufe no es de este agente")
        if accion not in ("encender", "apagar"):
            return self._responder(ws, id_comando, False, f"acción desconocida: {accion}")
        try:
            lector.poner_estado(accion == "encender")
        except ErrorEnchufe as e:
            log.warning("No se pudo %s %s: %s", accion, lector.nombre, e)
            return self._responder(ws, id_comando, False, f"el enchufe no respondió: {e}")
        except Exception as e:
            log.exception("Error inesperado ejecutando %s", accion)
            return self._responder(ws, id_comando, False, f"error del agente: {type(e).__name__}")
        log.info("%s: %s", lector.nombre, "encendido" if accion == "encender" else "apagado")
        self._responder(ws, id_comando, True, None)

    @staticmethod
    def _responder(ws, id_comando, ok: bool, error: str | None) -> None:
        ws.send(json.dumps({"tipo": "resultado", "id": id_comando, "ok": ok, "error": error}))
