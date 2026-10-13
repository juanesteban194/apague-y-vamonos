import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

Nivel = Literal["rojo", "amarillo", "verde"]
Sensibilidad = Literal["pocos", "normal", "todos"]


class AlertaOut(BaseModel):
    id: uuid.UUID
    dispositivo_id: uuid.UUID | None
    dispositivo_nombre: str | None
    tipo: str
    nivel: Nivel
    titulo: str
    mensaje: str
    fecha: datetime
    leida: bool


class PreferenciasAlertas(BaseModel):
    sensibilidad: Sensibilidad
