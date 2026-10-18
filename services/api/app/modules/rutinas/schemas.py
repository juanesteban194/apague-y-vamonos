import uuid
from datetime import datetime, time
from typing import Annotated

from pydantic import BaseModel, Field, field_validator, model_validator

Dia = Annotated[int, Field(ge=0, le=6)]  # 0 = lunes … 6 = domingo


class RutinaIn(BaseModel):
    dispositivo_id: uuid.UUID
    dias: list[Dia] = Field(min_length=1, max_length=7)
    hora_apagado: time
    hora_encendido: time | None = None
    activa: bool = True

    @field_validator("dias")
    @classmethod
    def sin_repetidos(cls, v: list[int]) -> list[int]:
        return sorted(set(v))

    @model_validator(mode="after")
    def horas_distintas(self):
        if self.hora_encendido is not None and self.hora_encendido == self.hora_apagado:
            raise ValueError("La hora de encendido debe ser distinta de la de apagado")
        return self


class UltimaEjecucion(BaseModel):
    cuando: datetime
    accion: str
    resultado: str


class RutinaOut(BaseModel):
    id: uuid.UUID
    dispositivo_id: uuid.UUID
    dispositivo_nombre: str
    dias: list[int]
    hora_apagado: time
    hora_encendido: time | None
    activa: bool
    ahorro_estimado_cop_mes: float | None  # None si falta la hora de encendido, la tarifa o datos del dispositivo
    ultima_ejecucion: UltimaEjecucion | None
