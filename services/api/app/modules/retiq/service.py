"""Simulador de reemplazo de un aparato (HU-05): ahorro mensual, meses para recuperar la inversión y valor presente neto (VPN).

VPN = −precio + Σ_{m=1..N} ahorro_mensual / (1 + i_m)^m, con i_m = (1 + tasa_anual)^(1/12) − 1 y N = 12 × años."""
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.modules.consumo import subsistencia
from app.modules.consumo.energia import BOGOTA
from app.modules.hogares.models import Hogar
from app.modules.retiq.schemas import SimuladorIn, SimuladorOut
from app.modules.tarifas.service import tarifa_vigente


def vpn(precio: float, ahorro_mensual: float, tasa_anual: float, anios: int) -> float:
    meses = anios * 12
    i = (1 + tasa_anual) ** (1 / 12) - 1
    if i == 0:
        return -precio + ahorro_mensual * meses
    return -precio + ahorro_mensual * (1 - (1 + i) ** -meses) / i  # valor presente de una anualidad vencida


def texto_meses(meses: float) -> str:
    total = max(1, round(meses))
    anios, resto = divmod(total, 12)
    partes = []
    if anios:
        partes.append(f"{anios} {'año' if anios == 1 else 'años'}")
    if resto:
        partes.append(f"{resto} {'mes' if resto == 1 else 'meses'}")
    return " y ".join(partes)


def precio_marginal(db: Session, hogar: Hogar, ahora: datetime) -> float | None:
    """Lo que vale el kWh que se deja de gastar: el de después de la subsistencia si el hogar ya la pasó; si no, el subsidiado."""
    tarifa = tarifa_vigente(db, hogar.estrato, ahora.astimezone(BOGOTA).date())
    if tarifa is None:
        return None
    ya_paso = subsistencia.calcular(db, hogar, ahora).porcentaje >= 1.0
    return float(tarifa.cop_kwh_sobre_subsistencia if ya_paso else tarifa.cop_kwh_subsistencia)


def simular(db: Session, hogar: Hogar, datos: SimuladorIn, ahora: datetime | None = None) -> SimuladorOut:
    ahora = ahora or datetime.now(UTC)
    ahorro_kwh = datos.consumo_actual_kwh_mes - datos.consumo_nuevo_kwh_mes
    precio = precio_marginal(db, hogar, ahora)
    if precio is None or ahorro_kwh <= 0:
        return SimuladorOut(
            ahorro_kwh_mes=round(ahorro_kwh, 2), ahorro_cop_mes=0.0, precio_kwh_usado=precio, conviene=False, meses_recuperacion=None,
            texto_recuperacion=None, vpn_cop=None if precio is None else round(-datos.precio_nuevo_cop, 2), pagado_en_vida_util=False,
        )
    ahorro_cop = ahorro_kwh * precio
    meses = datos.precio_nuevo_cop / ahorro_cop
    valor = vpn(datos.precio_nuevo_cop, ahorro_cop, datos.tasa_anual, datos.anios)
    return SimuladorOut(
        ahorro_kwh_mes=round(ahorro_kwh, 2), ahorro_cop_mes=round(ahorro_cop, 2), precio_kwh_usado=precio, conviene=valor > 0,
        meses_recuperacion=round(meses, 1), texto_recuperacion=texto_meses(meses), vpn_cop=round(valor, 2), pagado_en_vida_util=meses <= datos.anios * 12,
    )
