import uuid

from pydantic import BaseModel, Field


class DispositivoIn(BaseModel):
    tuya_id: str = Field(min_length=1, max_length=64)
    nombre: str = Field(min_length=1, max_length=120)
    tipo_aparato: str | None = Field(default=None, max_length=60)
    alto_riesgo: bool = False
    umbral_minutos_encendido: int | None = Field(default=None, gt=0)


class DispositivoOut(DispositivoIn):
    id: uuid.UUID

    model_config = {"from_attributes": True}
