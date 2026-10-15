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


class EliminarCuentaIn(BaseModel):
    # Las cuentas con contraseña la confirman; las que entran solo con Google no tienen una.
    contrasena: str | None = None


class UsuarioOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nombre: str

    model_config = {"from_attributes": True}


class TokensOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class PerfilOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nombre: str
    tiene_consentimiento: bool
    tiene_contrasena: bool
    tiene_google: bool


class CanjeGoogleIn(BaseModel):
    code: str = Field(min_length=10, max_length=2000)
    code_verifier: str = Field(min_length=43, max_length=128)
