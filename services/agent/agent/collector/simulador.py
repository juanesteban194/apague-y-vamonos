"""Enchufe simulado, para probar la app sin el enchufe real (otra red, sin hardware) o como respaldo en una demostración.

Tiene la misma interfaz que `LectorEnchufe` (`tuya_id`, `nombre`, `leer()`), así que pasa por el mismo agente: cola SQLite, reintentos,
envío a la API. Imita un ventilador: potencia estable con algo de ruido y, de vez en cuando, se apaga unos segundos."""
import random
import time
from collections.abc import Callable
from datetime import UTC, datetime

FACTOR_DE_POTENCIA = 0.94  # el del ventilador medido (ADR 0001: 26,6 W con 221 mA a 128,1 V)


class LectorSimulado:
    def __init__(
        self,
        tuya_id: str,
        vatios: float = 26.5,
        apagar_cada_s: float | None = 180,
        apagado_s: float = 20,
        reloj: Callable[[], float] = time.monotonic,
        azar: random.Random | None = None,
    ):
        self.tuya_id = tuya_id
        self.nombre = f"Enchufe simulado {tuya_id}"
        self._vatios = vatios
        self._apagar_cada_s = apagar_cada_s
        self._apagado_s = apagado_s
        self._reloj = reloj
        self._inicio = reloj()
        self._azar = azar or random.Random()

    def _encendido(self) -> bool:
        if not self._apagar_cada_s:
            return True
        # Ciclo: encendido `apagar_cada_s` segundos y apagado `apagado_s`.
        return (self._reloj() - self._inicio) % (self._apagar_cada_s + self._apagado_s) < self._apagar_cada_s

    def leer(self) -> dict:
        voltaje = round(128.0 + self._azar.uniform(-0.6, 0.6), 1)
        if self._encendido():
            potencia = round(max(0.1, self._vatios + self._azar.uniform(-0.04, 0.04) * self._vatios), 1)
            corriente = round(potencia / (voltaje * FACTOR_DE_POTENCIA) * 1000)
        else:
            potencia, corriente = 0.0, 0
        return {
            "tuya_id": self.tuya_id,
            "fecha_hora": datetime.now(UTC).isoformat(),
            "potencia_w": potencia,
            "voltaje_v": voltaje,
            "corriente_ma": corriente,
            "encendido": potencia > 0,
        }


