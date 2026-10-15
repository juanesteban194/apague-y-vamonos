from pydantic import AwareDatetime, BaseModel, Field


class LecturaIn(BaseModel):
    tuya_id: str = Field(min_length=1, max_length=64)
    fecha_hora: AwareDatetime  # con zona horaria: el agente manda UTC
    potencia_w: float = Field(ge=0)
    voltaje_v: float = Field(ge=0)
    corriente_ma: int = Field(ge=0)
    encendido: bool


class LecturasIn(BaseModel):
    # Tope técnico por petición (el agente reenvía en lotes tras una caída de internet).
    lecturas: list[LecturaIn] = Field(min_length=1, max_length=1000)


class LecturasOut(BaseModel):
    recibidas: int
    guardadas: int
    duplicadas: int
    desconocidas: int  # lecturas de un tuya_id que no es de este hogar
    de_otro_agente: int = 0  # lecturas de un enchufe de este hogar que está asignado a otro agente: se descartan
