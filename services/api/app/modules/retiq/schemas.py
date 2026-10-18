import uuid

from pydantic import BaseModel, Field


class SimuladorIn(BaseModel):
    """Reemplazo de un dispositivo. Los consumos salen de lo que MIDE el enchufe (actual) y de la etiqueta RETIQ del dispositivo nuevo (kWh/mes)."""

    hogar_id: uuid.UUID
    consumo_actual_kwh_mes: float = Field(ge=0, le=100_000)
    consumo_nuevo_kwh_mes: float = Field(ge=0, le=100_000)
    precio_nuevo_cop: float = Field(gt=0, le=1_000_000_000)
    tasa_anual: float = Field(ge=0, le=1, description="Tasa de descuento efectiva anual: 0,12 = 12 %")
    anios: int = Field(ge=1, le=30, description="Años en los que se cuentan los ahorros (vida útil del dispositivo nuevo)")


class SimuladorOut(BaseModel):
    ahorro_kwh_mes: float
    ahorro_cop_mes: float
    precio_kwh_usado: float | None  # None si el hogar no tiene tarifa cargada
    conviene: bool  # el VPN es positivo
    meses_recuperacion: float | None  # None si no ahorra
    texto_recuperacion: str | None  # "2 años y 7 meses"
    vpn_cop: float | None
    pagado_en_vida_util: bool  # se recupera dentro de los años indicados
