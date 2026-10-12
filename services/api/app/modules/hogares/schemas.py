import uuid

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
