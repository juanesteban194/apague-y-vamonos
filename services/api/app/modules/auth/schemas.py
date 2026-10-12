import uuid

from pydantic import BaseModel, EmailStr, Field


class RegistroIn(BaseModel):
    email: EmailStr
    contrasena: str = Field(min_length=8, max_length=128)
    nombre: str = Field(min_length=1, max_length=120)
    # Ley 1581 de 2012: sin aceptación explícita no se crea la cuenta.
    acepta_tratamiento_datos: bool


class LoginIn(BaseModel):
    email: EmailStr
    contrasena: str = Field(max_length=128)


class RenovarIn(BaseModel):
    refresh_token: str


class UsuarioOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nombre: str

    model_config = {"from_attributes": True}


class TokensOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
