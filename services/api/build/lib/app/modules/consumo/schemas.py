import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.modules.tarifas.schemas import TarifaOut


class DispositivoResumen(BaseModel):
    id: uuid.UUID
    nombre: str
    encendido: bool | None  # None si nunca ha enviado lecturas
    potencia_w: float | None
    ultima_lectura: datetime | None
    en_linea: bool  # última lectura de hace ≤ 60 s; si no, la app avisa "dato con retraso"
    kwh_hoy: float
    kwh_mes: float
    costo_hoy_cop: float | None  # None si no hay tarifa cargada
    costo_mes_cop: float | None


class SubsistenciaOut(BaseModel):
    limite_kwh: float
    consumo_kwh: float
    porcentaje: float  # 0,62 = 62 % del límite mensual
    fuente: Literal["medidor", "enchufes"]  # "enchufes" = solo lo que miden los enchufes, no toda la casa
    nivel: Literal["verde", "amarillo", "rojo"]


class SemaforoOut(BaseModel):
    estado: Literal["ok", "sin_historial", "sin_medidor"]
    nivel: Literal["verde", "amarillo", "rojo"] | None
    titulo: str
    mensaje: str
    promedio_kwh: float | None
    proyeccion_kwh: float | None
    diferencia_cop: float | None  # > 0: pagaría de más que su promedio


class EquivalenciaOut(BaseModel):
    texto: str  # "Es como dejar el televisor de la sala prendido 21 horas."
    icono: str


class ResumenOut(BaseModel):
    hogar_id: uuid.UUID
    calculado_en: datetime
    tarifa: TarifaOut | None
    kwh_hoy: float
    kwh_mes: float
    costo_hoy_cop: float | None
    costo_mes_cop: float | None
    subsistencia: SubsistenciaOut
    semaforo: SemaforoOut
    equivalencias: list[EquivalenciaOut]  # de lo que miden hoy los enchufes
    dispositivos: list[DispositivoResumen]


class PuntoConsumo(BaseModel):
    inicio: datetime  # hora o día, en zona America/Bogota
    kwh: float
    costo_cop: float | None


class ConsumoOut(BaseModel):
    dispositivo_id: uuid.UUID
    periodo: Literal["dia", "semana", "mes"]
    desde: datetime
    hasta: datetime
    tarifa_mes: date | None
    kwh_total: float
    costo_total_cop: float | None
    serie: list[PuntoConsumo]


class ConsejoOut(BaseModel):
    id: str
    tipo: str  # completar | sobre_promedio | mayor_gasto | rutina | retiq
    icono: str
    titulo: str
    mensaje: str
    ahorro_cop_mes: float | None
    accion: Literal["historial", "medidor", "enchufe", "rutina", "simulador"] | None  # a qué pantalla lleva el botón
    dispositivo_id: uuid.UUID | None
    consumo_kwh_mes: float | None  # lo que mide el enchufe (precarga el simulador)


class EquivalenciaFuenteOut(BaseModel):
    nombre: str
    tipo: Literal["energia", "precio"]
    activa: bool
    fuente: str  # de dónde sale el valor de cada equivalencia (o por qué está apagada)
