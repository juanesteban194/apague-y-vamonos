from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SaldoIn(BaseModel):
    saldo_cop: float = Field(ge=0, le=100_000_000)


class RegistroSaldo(BaseModel):
    saldo_cop: float
    registrado_en: datetime


class PrepagoOut(BaseModel):
    estado: Literal["sin_registros", "datos_insuficientes", "ok"]
    saldo_cop: float | None
    registrado_en: datetime | None
    promedio_diario_cop: float | None  # promedio de los últimos 3 días
    dias_restantes: float | None  # None si no hay consumo medible
    se_acaba_el: datetime | None
    nivel: Literal["rojo", "verde"] | None  # rojo: quedan menos de 48 h
    registros: list[RegistroSaldo]
