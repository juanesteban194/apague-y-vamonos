import uuid
from typing import Literal

from pydantic import BaseModel, Field


class DispositivoIn(BaseModel):
    tuya_id: str = Field(min_length=1, max_length=64)
    nombre: str = Field(min_length=1, max_length=120)
    tipo_aparato: str | None = Field(default=None, max_length=60)
    alto_riesgo: bool = False
    umbral_minutos_encendido: int | None = Field(default=None, gt=0)
    agente_id: uuid.UUID | None = None  # qué agente lo lee; debe ser de la misma casa


class DispositivoOut(DispositivoIn):
    id: uuid.UUID
    factor_calibracion: float = 1.0  # 1 = los vatios se muestran tal cual los lee el enchufe
    calibracion_referencia_w: float | None = None  # el medidor con el que se calibró, si se calibró

    model_config = {"from_attributes": True}


class DispositivoActualizarIn(BaseModel):
    """El ID de Tuya no se cambia: es el vínculo con el enchufe físico."""

    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    tipo_aparato: str | None = Field(default=None, max_length=60)
    alto_riesgo: bool | None = None
    umbral_minutos_encendido: int | None = Field(default=None, gt=0)
    agente_id: uuid.UUID | None = None  # null quita el agente


class CalibrarIn(BaseModel):
    """Lo que marca un medidor de referencia confiable mientras el dispositivo está prendido y estable."""

    referencia_w: float = Field(gt=0, le=3000)


class CalibracionOut(BaseModel):
    factor_calibracion: float
    referencia_w: float
    lectura_antes_w: float  # lo que leía el enchufe antes del ajuste (promedio de los últimos segundos)
    lectura_despues_w: float  # lo que leerá con el ajuste: debe coincidir con la referencia


class CorrienteOut(BaseModel):
    """Corriente habitual del dispositivo (rango del percentil 10 al 90 de sus últimos 7 días consumiendo) y la de ahora."""

    estado: Literal["aprendiendo", "apagado", "normal", "alta", "baja"]
    normal_ma: float | None
    bajo_ma: float | None
    alto_ma: float | None
    ahora_ma: float | None
    dias: int
