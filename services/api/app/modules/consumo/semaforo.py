"""Semáforo del mes (HU-04), contra el promedio de las facturas de EPM (objetivo del producto: pagar menos que el promedio).

Decisión del equipo: verde si el mes proyectado es ≤ promedio, amarillo hasta +10 %, rojo por encima. La proyección sale del ritmo del medidor
(lectura base y última lectura del mes): los enchufes no miden toda la casa, así que no sirven para comparar con la factura."""
import calendar
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Literal

from sqlalchemy.orm import Session

from app.modules.consumo import historial, subsistencia
from app.modules.consumo.costo import costo_por_bloques
from app.modules.consumo.energia import BOGOTA, inicio_mes_bogota
from app.modules.hogares.models import Hogar
from app.modules.tarifas.service import tarifa_vigente

VERDE_HASTA = 1.00
AMARILLO_HASTA = 1.10


@dataclass(frozen=True)
class Semaforo:
    estado: Literal["ok", "sin_historial", "sin_medidor"]
    nivel: Literal["verde", "amarillo", "rojo"] | None
    titulo: str
    mensaje: str
    promedio_kwh: float | None = None
    proyeccion_kwh: float | None = None
    diferencia_cop: float | None = None  # proyectado − promedio, en pesos con la tarifa vigente; > 0 = pagaría de más


def nivel_de(proyeccion: float, promedio: float) -> Literal["verde", "amarillo", "rojo"]:
    razon = proyeccion / promedio if promedio > 0 else 0.0
    return "verde" if razon <= VERDE_HASTA else "amarillo" if razon <= AMARILLO_HASTA else "rojo"


def _pesos(valor: float) -> str:
    return "$" + f"{round(abs(valor)):,}".replace(",", ".")


def calcular(db: Session, hogar: Hogar, ahora: datetime) -> Semaforo:
    _, promedio, _ = historial.promedios(historial.leer(db, hogar.id))
    if promedio is None:
        return Semaforo("sin_historial", None, "Falta tu histórico", "Anota los meses de tu factura de EPM y te decimos si vas por encima o por debajo de lo normal.")
    par = subsistencia.lecturas_del_mes(db, hogar, inicio_mes_bogota(ahora))
    dias = (par[1].fecha - par[0].fecha).days if par else 0
    if par is None or dias < 1:
        return Semaforo("sin_medidor", None, "Falta la lectura del medidor", "Anota la lectura de tu medidor en dos días distintos y te mostramos cómo cerraría el mes.", promedio_kwh=round(promedio, 2))

    local = ahora.astimezone(BOGOTA)
    consumo = max(0.0, par[1].lectura_kwh - par[0].lectura_kwh)
    proyeccion = consumo / dias * calendar.monthrange(local.year, local.month)[1]
    nivel = nivel_de(proyeccion, promedio)

    diferencia = None
    tarifa = tarifa_vigente(db, hogar.estrato, local.date())
    if tarifa is not None:
        limite = float(hogar.limite_subsistencia_kwh)
        sub, sobre = Decimal(tarifa.cop_kwh_subsistencia), Decimal(tarifa.cop_kwh_sobre_subsistencia)
        diferencia = float(costo_por_bloques(proyeccion, limite, sub, sobre) - costo_por_bloques(promedio, limite, sub, sobre))

    titulo = {"verde": "Vas bien", "amarillo": "Vas medio alto", "rojo": "Vas alto"}[nivel]
    if diferencia is None:
        mensaje = "Si sigues así, este mes gastas " + ("menos" if nivel == "verde" else "más") + " que tu promedio."
    elif nivel == "verde":
        mensaje = f"Si sigues así, este mes pagas unos {_pesos(diferencia)} menos que tu promedio." if diferencia < 0 else "Si sigues así, este mes pagas lo mismo que tu promedio."
    else:
        mensaje = f"Si sigues así, este mes pagas unos {_pesos(diferencia)} más que tu promedio."
    return Semaforo("ok", nivel, titulo, mensaje, round(promedio, 2), round(proyeccion, 2), None if diferencia is None else round(diferencia, 2))
