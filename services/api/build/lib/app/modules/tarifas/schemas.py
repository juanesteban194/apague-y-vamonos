from datetime import date

from pydantic import BaseModel


class TarifaOut(BaseModel):
    estrato: int
    mes: date  # primer día del mes de la tarifa
    cop_kwh_subsistencia: float
    cop_kwh_sobre_subsistencia: float
    fuente: str
    # False si se usa la tarifa de un mes anterior porque aún no se carga la del mes actual.
    es_del_mes_actual: bool

    model_config = {"from_attributes": True}
