"""Costo = energía × tarifa del estrato y del mes, con dos bloques: hasta la subsistencia y sobre ella.

Se calcula como la factura de EPM: toda la energía al costo unitario (tarifa "sobre subsistencia") menos el subsidio de los
kWh dentro del límite, cada concepto redondeado a centavos (verificado contra una factura real, ver docs/decisiones/0002)."""
from decimal import ROUND_HALF_UP, Decimal

CENTAVO = Decimal("0.01")


def costo_por_bloques(
    kwh_mes: float, limite_subsistencia: float, cop_subsistencia: Decimal, cop_sobre: Decimal, redondear: bool = True
) -> Decimal:
    """Costo del consumo acumulado del mes (kWh), cobrando hasta el límite a una tarifa y el resto a otra.

    `redondear=True` replica la factura (cada concepto a centavos). El precio medio por dispositivo usa `False`: a consumos
    de unos pocos pesos, redondear cada concepto movería el precio por kWh."""
    kwh = Decimal(str(kwh_mes))
    dentro = min(kwh, Decimal(str(limite_subsistencia)))
    energia = kwh * cop_sobre
    subsidio = dentro * (cop_sobre - cop_subsistencia)
    if redondear:
        energia, subsidio = energia.quantize(CENTAVO, ROUND_HALF_UP), subsidio.quantize(CENTAVO, ROUND_HALF_UP)
    return energia - subsidio


def precio_medio(
    kwh_mes: float, limite_subsistencia: float, cop_subsistencia: Decimal, cop_sobre: Decimal
) -> Decimal:
    """COP/kWh efectivo del mes. Con consumo 0 se usa la tarifa del primer bloque."""
    if kwh_mes <= 0:
        return cop_subsistencia
    return costo_por_bloques(kwh_mes, limite_subsistencia, cop_subsistencia, cop_sobre, redondear=False) / Decimal(str(kwh_mes))


def costo_de(kwh: float, precio: Decimal) -> Decimal:
    return (Decimal(str(kwh)) * precio).quantize(CENTAVO, ROUND_HALF_UP)
