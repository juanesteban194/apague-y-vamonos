import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class VincularIn(BaseModel):
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class VinculadoOut(BaseModel):
    """Lo que recibe el programa del agente al usar el código. El token solo se entrega aquí, una vez."""

    agente_id: uuid.UUID
    nombre: str
    hogar_nombre: str
    token: str


class EnchufeConfigOut(BaseModel):
    tuya_id: str
    nombre: str
    clave_local: str


class ConfiguracionOut(BaseModel):
    agente_id: uuid.UUID
    nombre: str
    enchufes: list[EnchufeConfigOut]
    sin_clave: list[str]  # IDs de enchufes asignados a este agente de los que aún no se tiene la clave
    motivos: dict[str, str] = {}  # por qué falta cada una (para que el agente y quien lo instala sepan qué arreglar)


class ClavesIn(BaseModel):
    """Claves locales que el agente ya tiene (por ejemplo de su devices.json), por ID de Tuya."""

    claves: dict[str, str] = Field(min_length=1, max_length=50)


class ClavesGuardadasOut(BaseModel):
    guardadas: list[str]
    ignoradas: list[str]  # no son enchufes asignados a este agente


class AgenteConCodigoOut(BaseModel):
    id: uuid.UUID
    nombre: str
    codigo: str
    expira_en: datetime
