"""Lectura local del enchufe con TinyTuya: detecta el protocolo, reconecta y redescubre la IP si cambia (DHCP)."""
import logging
from collections.abc import Callable
from datetime import UTC, datetime

import tinytuya

from agent.collector.escalas import a_lectura

log = logging.getLogger("agente.lector")

PROTOCOLOS = (3.5, 3.4, 3.3)  # el BSD04 responde con 3.5
FALLOS_PARA_REDESCUBRIR = 3
TIEMPO_ESPERA_S = 4


class ErrorEnchufe(Exception):
    """No se pudo leer el enchufe (no es fatal: el agente reintenta en el siguiente ciclo)."""


def _escanear_red() -> dict:
    """{id_tuya: {"ip": ..., "version": ...}} de lo que responde por la LAN."""
    encontrados = tinytuya.deviceScan(verbose=False, maxretry=4, byID=True)
    return encontrados or {}


class LectorEnchufe:
    def __init__(
        self,
        dispositivo: dict,
        fabrica: Callable = tinytuya.OutletDevice,
        escanear: Callable[[], dict] = _escanear_red,
    ):
        self.tuya_id: str = dispositivo["id"]
        self.nombre: str = dispositivo.get("name", self.tuya_id)
        self._clave: str = dispositivo["key"]
        self._ip: str | None = dispositivo.get("ip") or None
        self._version = float(dispositivo["ver"]) if dispositivo.get("ver") else None
        self._fabrica = fabrica
        self._escanear = escanear
        self._dev = None
        self._dps: dict = {}  # con conexión persistente el enchufe devuelve solo los DP que cambiaron
        self._fallos = 0

    def leer(self) -> dict | None:
        """Una lectura lista para enviar. None si aún faltan DP. ErrorEnchufe si no responde."""
        # Al conectar, la propia consulta de prueba es la primera lectura (no se pide dos veces).
        respuesta = self._conectar() if self._dev is None else self._dev.status()
        if not isinstance(respuesta, dict) or "Error" in respuesta or not respuesta.get("dps"):
            self._registrar_fallo()
            raise ErrorEnchufe(str(respuesta.get("Error") if isinstance(respuesta, dict) else respuesta))
        self._fallos = 0
        self._dps.update(respuesta["dps"])
        return a_lectura(self.tuya_id, self._dps, datetime.now(UTC).isoformat())

    def _conectar(self) -> dict:
        """Abre la conexión y devuelve la respuesta de prueba, que sirve como primera lectura."""
        if not self._ip:
            self._redescubrir()
        for version in [self._version] if self._version else PROTOCOLOS:
            dev = self._fabrica(self.tuya_id, self._ip, self._clave)
            dev.set_version(version)
            dev.set_socketTimeout(TIEMPO_ESPERA_S)
            respuesta = dev.status()
            if isinstance(respuesta, dict) and respuesta.get("dps"):
                dev.set_socketPersistent(True)
                self._dev, self._version = dev, version
                self._dps = {}
                log.info("%s: conectado en %s (protocolo %s)", self.nombre, self._ip, version)
                return respuesta
        self._registrar_fallo()
        raise ErrorEnchufe(f"no responde en {self._ip} (¿IP o clave local cambiaron?)")

    def _registrar_fallo(self) -> None:
        self._fallos += 1
        self._cerrar()
        if self._fallos >= FALLOS_PARA_REDESCUBRIR:
            self._redescubrir()
            self._fallos = 0

    def _cerrar(self) -> None:
        if self._dev is not None:
            try:
                self._dev.close()
            except Exception:
                pass
        self._dev = None

    def _redescubrir(self) -> None:
        """El router puede dar otra IP al enchufe: se busca por la red y se actualiza en memoria."""
        try:
            hallado = self._escanear().get(self.tuya_id)
        except Exception as e:
            log.warning("%s: falló el escaneo de la red: %s", self.nombre, e)
            return
        if hallado and hallado.get("ip"):
            if hallado["ip"] != self._ip:
                log.info("%s: nueva IP %s (antes %s)", self.nombre, hallado["ip"], self._ip)
            self._ip = hallado["ip"]
            self._version = float(hallado["version"]) if hallado.get("version") else self._version
        else:
            log.warning("%s: no apareció en el escaneo de la red", self.nombre)
