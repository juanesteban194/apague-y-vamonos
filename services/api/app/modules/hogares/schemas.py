import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class HogarIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    barrio: str | None = Field(default=None, max_length=120)
    estrato: int = Field(ge=1, le=6)
    tipo_medidor: str | None = Field(default=None, max_length=30)


class HogarOut(HogarIn):
    id: uuid.UUID
    limite_subsistencia_kwh: float
    rol: str


class AgenteIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)


class AgenteCreadoOut(BaseModel):
    id: uuid.UUID
    nombre: str
    # Se muestra una sola vez: en la base solo queda su hash.
    token: str


class HogarActualizarIn(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    barrio: str | None = Field(default=None, max_length=120)
    estrato: int | None = Field(default=None, ge=1, le=6)
    tipo_medidor: str | None = Field(default=None, max_length=30)


class AgenteOut(BaseModel):
    id: uuid.UUID
    nombre: str
    ultima_conexion: datetime | None
    creado_en: datetime

    model_config = {"from_attributes": True}


class LecturaMedidorIn(BaseModel):
    lectura_kwh: float = Field(ge=0)
    fecha: date | None = None  # por defecto, hoy (hora de Colombia)


class LecturaMedidorOut(BaseModel):
    id: uuid.UUID
    lectura_kwh: float
    fecha: date

    model_config = {"from_attributes": True}
