"""Calibrar los vatios de un enchufe contra un medidor de referencia (docs/decisiones/0012).

El enchufe mide con cierto error (por ejemplo, 48 W donde un medidor de pared marca 44 W). Con una sola referencia se corrige la ganancia:
factor = referencia / lectura_cruda. El factor se aplica a las lecturas NUEVAS al guardarlas, así que el costo, los avisos y los consejos usan
los vatios ya corregidos. Las lecturas viejas no se tocan."""
import statistics
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.dispositivos.models import Dispositivo
from app.modules.dispositivos.schemas import CalibracionOut
from app.modules.ingesta.models import Lectura

VENTANA = timedelta(seconds=90)  # se promedian las lecturas de los últimos 90 s
LECTURAS_MINIMAS = 4  # a 5 s por lectura son 20 s de datos estables
POTENCIA_MINIMA_W = 5.0  # con una carga más chica el error relativo del medidor de referencia domina
VARIACION_MAXIMA = 0.10  # desviación / promedio: si la carga oscila más, el promedio no sirve de referencia
FACTOR_MINIMO, FACTOR_MAXIMO = 0.5, 1.5  # más de 50 % de diferencia casi seguro es un medidor mal puesto, no un error del enchufe


def calibrar(db: Session, dispositivo: Dispositivo, referencia_w: float, ahora: datetime | None = None) -> CalibracionOut:
    ahora = ahora or datetime.now(UTC)
    desde = ahora - VENTANA
    if dispositivo.calibrado_en is not None:
        desde = max(desde, dispositivo.calibrado_en)  # nada de lecturas guardadas con un factor anterior
    guardadas = [
        l.potencia_w
        for l in db.scalars(
            select(Lectura).where(Lectura.dispositivo_id == dispositivo.id, Lectura.fecha_hora > desde, Lectura.encendido.is_(True)).order_by(Lectura.fecha_hora)
        )
    ]
    if len(guardadas) < LECTURAS_MINIMAS:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Todavía no hay suficientes lecturas recientes. Deja el dispositivo prendido, con el agente corriendo, y vuelve a intentar en unos segundos.",
        )
    promedio_guardado = statistics.fmean(guardadas)
    cruda = promedio_guardado / dispositivo.factor_calibracion  # lo que leyó el enchufe antes de cualquier ajuste
    if cruda < POTENCIA_MINIMA_W:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"El enchufe lee muy poco ({cruda:.1f} W): con menos de {POTENCIA_MINIMA_W:g} W no se puede calibrar bien. Usa un dispositivo que gaste más, por ejemplo un bombillo de 40 W.",
        )
    if len(guardadas) > 1 and statistics.pstdev(guardadas) / promedio_guardado > VARIACION_MAXIMA:
        raise HTTPException(status.HTTP_409_CONFLICT, "La lectura está variando mucho. Espera a que el dispositivo se estabilice (que no cambie de potencia) y vuelve a intentar.")
    factor = referencia_w / cruda
    if not FACTOR_MINIMO <= factor <= FACTOR_MAXIMO:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"El enchufe lee {cruda:.1f} W y tu medidor marca {referencia_w:g} W: la diferencia es de más del 50 %. Revisa que el medidor esté midiendo este mismo dispositivo.",
        )
    dispositivo.factor_calibracion = factor
    dispositivo.calibrado_en = ahora
    dispositivo.calibracion_referencia_w = referencia_w
    db.commit()
    return CalibracionOut(factor_calibracion=round(factor, 4), referencia_w=referencia_w, lectura_antes_w=round(promedio_guardado, 2), lectura_despues_w=round(cruda * factor, 2))


def quitar(db: Session, dispositivo: Dispositivo, ahora: datetime | None = None) -> None:
    dispositivo.factor_calibracion = 1.0
    dispositivo.calibrado_en = ahora or datetime.now(UTC)
    dispositivo.calibracion_referencia_w = None
    db.commit()
