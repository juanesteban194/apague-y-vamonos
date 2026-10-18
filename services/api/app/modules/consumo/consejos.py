"""Consejos para pagar menos (HU-04/HU-05). Salen de lo que MIDEN los enchufes y de los datos del hogar, no de reglas genéricas con cifras inventadas.

Primero van los pasos que faltan para poder comparar con el promedio de la factura (objetivo del producto); después lo que dicen los datos."""
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.consumo import historial, semaforo
from app.modules.consumo.energia import BOGOTA, energia_por_cubeta, inicio_mes_bogota
from app.modules.consumo.service import precio_del_mes
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Hogar
from app.modules.ingesta.models import Lectura

DIAS_DE_MEDICION = 7
DIAS_MINIMOS = 2  # con menos datos no se extrapola a un mes
HORAS_DE_NOCHE = {23, 0, 1, 2, 3, 4}  # de las 11 p. m. a las 5 a. m.
AHORRO_MINIMO_COP_MES = 1000  # por debajo de esto no vale la pena molestar con un consejo
# Dispositivos que NO se deben apagar de noche (alimentos): nunca se les sugiere una rutina de apagado.
SIEMPRE_PRENDIDOS = ("nevera", "refrigerador", "congelador", "nevecon", "frigobar")
# Dispositivos que cubre RETIQ y vale la pena comparar contra uno nuevo.
CUBIERTOS_POR_RETIQ = ("nevera", "refrigerador", "congelador", "nevecon", "lavadora", "aire", "calentador")

Accion = Literal["historial", "medidor", "enchufe", "rutina", "simulador"]


@dataclass(frozen=True)
class Consejo:
    id: str
    tipo: str
    icono: str
    titulo: str
    mensaje: str
    ahorro_cop_mes: float | None = None
    accion: Accion | None = None
    dispositivo_id: uuid.UUID | None = None
    consumo_kwh_mes: float | None = None  # lo que mide el enchufe, para precargar el simulador


def _normal(texto: str | None) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", (texto or "").lower()) if unicodedata.category(c) != "Mn")


def _es(d: Dispositivo, palabras: tuple[str, ...]) -> bool:
    nombre = f"{_normal(d.nombre)} {_normal(d.tipo_aparato)}"
    return any(p in nombre for p in palabras)


def _pesos(valor: float) -> str:
    return "$" + f"{round(valor):,}".replace(",", ".")


def _medicion(db: Session, d: Dispositivo, ahora: datetime) -> tuple[float, float] | None:
    """(kWh al mes estimados, kWh de noche al mes estimados) según los últimos 7 días, o None si hay menos de 2 días de datos."""
    desde = ahora - timedelta(days=DIAS_DE_MEDICION)
    primera = db.scalar(select(func.min(Lectura.fecha_hora)).where(Lectura.dispositivo_id == d.id, Lectura.fecha_hora >= desde))
    if primera is None:
        return None
    cubierto = min(DIAS_DE_MEDICION, (ahora - primera).total_seconds() / 86400)
    if cubierto < DIAS_MINIMOS:
        return None
    por_hora = energia_por_cubeta(db, [d.id], desde, ahora, "hour")
    total = sum(por_hora.values())
    noche = sum(kwh for (_, inicio), kwh in por_hora.items() if inicio.astimezone(BOGOTA).hour in HORAS_DE_NOCHE)
    return total / cubierto * 30, noche / cubierto * 30


def generar(db: Session, hogar: Hogar, ahora: datetime) -> list[Consejo]:
    consejos: list[Consejo] = []
    dispositivos = list(db.scalars(select(Dispositivo).where(Dispositivo.hogar_id == hogar.id).order_by(Dispositivo.creado_en)))
    estado = semaforo.calcular(db, hogar, ahora)

    # 1. Lo que falta para poder decir "va por encima o por debajo de su promedio"
    if estado.estado == "sin_historial":
        consejos.append(Consejo("completar-historial", "completar", "receipt", "Anote su factura de EPM",
                                "Con los meses del histórico de su factura sabemos cuánto es \"lo normal\" en su casa y le decimos si va ahorrando.", accion="historial"))
    if estado.estado == "sin_medidor":
        consejos.append(Consejo("completar-medidor", "completar", "gauge", "Anote la lectura de su medidor",
                                "Anótela hoy y otra en unos días: así proyectamos cómo cierra el mes frente a su promedio.", accion="medidor"))
    if not dispositivos:
        consejos.append(Consejo("completar-enchufe", "completar", "plug", "Conecte su primer enchufe", "Así vemos qué dispositivo gasta más y le contamos cómo bajar la cuenta.", accion="enchufe"))

    # 2. Va por encima de su promedio
    if estado.estado == "ok" and estado.nivel in ("amarillo", "rojo"):
        consejos.append(Consejo("sobre-el-promedio", "sobre_promedio", "alert", "Va por encima de su promedio", estado.mensaje))

    # 3. Lo que dicen los enchufes
    ids = [d.id for d in dispositivos]
    precio = precio_del_mes(db, hogar, ids, inicio_mes_bogota(ahora))[0] if ids else None
    mediciones = [(d, m) for d in dispositivos if (m := _medicion(db, d, ahora)) is not None]

    if precio and len(mediciones) >= 2:
        d, (kwh, _) = max(mediciones, key=lambda x: x[1][0])
        total = sum(m[0] for _, m in mediciones)
        if total > 0:
            consejos.append(Consejo(f"mayor-gasto-{d.id}", "mayor_gasto", "chart", f"{d.nombre} es lo que más gasta",
                                    f"Gasta unos {_pesos(kwh * float(precio))} al mes, el {round(kwh / total * 100)} % de lo que miden sus enchufes.", dispositivo_id=d.id))

    if precio:
        for d, (_, noche) in mediciones:
            ahorro = noche * float(precio)
            if ahorro >= AHORRO_MINIMO_COP_MES and not _es(d, SIEMPRE_PRENDIDOS):
                consejos.append(Consejo(f"noche-{d.id}", "rutina", "moon", f"{d.nombre} gasta de noche",
                                        f"Entre las 11 p. m. y las 5 a. m. gasta unos {_pesos(ahorro)} al mes. Si no lo necesita a esas horas, programe que se apague solo.",
                                        ahorro_cop_mes=round(ahorro, 2), accion="rutina", dispositivo_id=d.id))
        for d, (kwh, _) in mediciones:
            if _es(d, CUBIERTOS_POR_RETIQ) and kwh > 0:
                consejos.append(Consejo(f"retiq-{d.id}", "retiq", "swap", f"¿Le conviene cambiar {d.nombre}?",
                                        f"Gasta unos {_pesos(kwh * float(precio))} al mes. Compare con uno nuevo usando la etiqueta de eficiencia (RETIQ).",
                                        accion="simulador", dispositivo_id=d.id, consumo_kwh_mes=round(kwh, 2)))
    return consejos
