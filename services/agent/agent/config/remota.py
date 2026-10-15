"""Configuración que el agente pide a la API (qué enchufes le tocan y sus claves) en vez de leer devices.json.

Cada minuto se vuelve a pedir: si en la app se le asigna o quita un enchufe, el agente lo empieza o deja de leer sin reiniciar."""
import logging
import threading
from collections.abc import Callable

import httpx

from agent.collector.lector import LectorEnchufe

log = logging.getLogger("agente.config")

CADA_S = 60


class Registro:
    """Los lectores activos. Las lecturas y las órdenes consultan este registro, así ven los cambios sin reiniciar."""

    def __init__(self, lectores: list | None = None):
        self._candado = threading.Lock()
        self._por_id = {l.tuya_id: l for l in (lectores or [])}
        self._claves: dict[str, str] = {}

    def lectores(self) -> list:
        with self._candado:
            return list(self._por_id.values())

    def get(self, tuya_id: str):
        with self._candado:
            return self._por_id.get(tuya_id)

    def actualizar(self, enchufes: list[dict], fabrica: Callable = LectorEnchufe) -> tuple[list[str], list[str]]:
        """Deja activos exactamente estos enchufes. Devuelve (agregados, quitados) por nombre."""
        deseados = {e["tuya_id"]: e for e in enchufes}
        agregados, quitados = [], []
        with self._candado:
            for tuya_id in list(self._por_id):
                if tuya_id not in deseados:
                    quitados.append(self._por_id.pop(tuya_id).nombre)
                    self._claves.pop(tuya_id, None)
            for tuya_id, e in deseados.items():
                if tuya_id in self._por_id and self._claves.get(tuya_id) == e["clave_local"]:
                    continue  # sin cambios
                self._por_id[tuya_id] = fabrica({"id": tuya_id, "key": e["clave_local"], "name": e["nombre"]})
                self._claves[tuya_id] = e["clave_local"]
                agregados.append(e["nombre"])
        return agregados, quitados


def pedir(cliente: httpx.Client) -> dict:
    r = cliente.get("/agentes/configuracion")
    if r.status_code == 401:
        raise PermissionError("La API rechaza el token de este agente")
    r.raise_for_status()
    return r.json()


def sincronizar(cliente: httpx.Client, registro: Registro) -> bool:
    """Una pasada. True si se pudo hablar con la API. Nunca lanza: sin internet se sigue con lo último que se sabía."""
    try:
        config = pedir(cliente)
    except PermissionError as e:
        log.error("%s: vuelve a vincularlo con un código nuevo de la app", e)
        return False
    except (httpx.HTTPError, ValueError) as e:
        log.warning("No se pudo pedir la configuración (%s); se sigue con la última conocida", type(e).__name__)
        return False
    agregados, quitados = registro.actualizar(config["enchufes"])
    if agregados:
        log.info("Ahora lee: %s", ", ".join(agregados))
    if quitados:
        log.info("Dejó de leer: %s (ya no están asignados a este agente)", ", ".join(quitados))
    if config["sin_clave"]:
        log.warning("%d enchufe(s) asignados sin clave local guardada todavía: %s", len(config["sin_clave"]), ", ".join(config["sin_clave"]))
    return True


def bucle(cliente: httpx.Client, registro: Registro, parar: threading.Event) -> None:
    while not parar.is_set():
        sincronizar(cliente, registro)
        parar.wait(CADA_S)
