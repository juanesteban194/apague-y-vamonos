"""Costo = energía × tarifa del estrato y del mes, con dos bloques: hasta la subsistencia y sobre ella."""
from decimal import ROUND_HALF_UP, Decimal

CENTAVO = Decimal("0.01")


def costo_por_bloques(
    kwh_mes: float, limite_subsistencia: float, cop_subsistencia: Decimal, cop_sobre: Decimal
) -> Decimal:
    """Costo del consumo acumulado del mes (kWh), cobrando hasta el límite a una tarifa y el resto a otra."""
    kwh = Decimal(str(kwh_mes))
    limite = Decimal(str(limite_subsistencia))
    dentro = min(kwh, limite)
    sobre = max(kwh - limite, Decimal(0))
    return (dentro * cop_subsistencia + sobre * cop_sobre).quantize(CENTAVO, ROUND_HALF_UP)


def precio_medio(
    kwh_mes: float, limite_subsistencia: float, cop_subsistencia: Decimal, cop_sobre: Decimal
) -> Decimal:
    """COP/kWh efectivo del mes. Con consumo 0 se usa la tarifa del primer bloque."""
    if kwh_mes <= 0:
        return cop_subsistencia
    return costo_por_bloques(kwh_mes, limite_subsistencia, cop_subsistencia, cop_sobre) / Decimal(str(kwh_mes))


def costo_de(kwh: float, precio: Decimal) -> Decimal:
    return (Decimal(str(kwh)) * precio).quantize(CENTAVO, ROUND_HALF_UP)
