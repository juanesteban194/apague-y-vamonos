"""Corriente habitual de cada dispositivo y si la de ahora se sale de ella (posible otro dispositivo en el mismo enchufe).

Lo normal sale de las lecturas de los últimos 7 días en que el dispositivo estaba consumiendo (sin la última hora, para que un
cambio reciente no se cuele en «lo normal»). Se guarda como un rango, del percentil 10 al 90: una nevera que arranca y para, o un
televisor con más o menos brillo, se mueven dentro de él. Lo de ahora es la mediana de los últimos 15 minutos consumiendo.

Los umbrales son decisiones de producto, no datos del dominio: están aquí, juntos, para poder ajustarlos (docs/decisiones/0013)."""
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

DIAS_BASE = 7
SIN_LA_ULTIMA = timedelta(hours=1)  # la base no incluye la última hora
VENTANA = timedelta(minutes=15)  # lo de ahora: mediana de los últimos 15 minutos
MA_CONSUMIENDO = 30  # por debajo de 30 mA el dispositivo está apagado o en espera: no cuenta
LECTURAS_BASE_MINIMAS = 720  # una hora consumiendo (a una lectura cada 5 s)
DIAS_BASE_MINIMOS = 2
LECTURAS_VENTANA_MINIMAS = 60  # al menos 5 de los 15 minutos consumiendo
MARGEN_ALTO = 1.4  # avisa si lo de ahora supera en 40 % el borde alto de lo normal…
MARGEN_BAJO = 0.6  # …o queda por debajo del 60 % del borde bajo
DIFERENCIA_MINIMA_MA = 150  # y la diferencia es de al menos 0,15 A (en cargas pequeñas un porcentaje grande es ruido)
CACHE_BASE = timedelta(hours=1)  # la base cambia despacio: se recalcula como mucho una vez por hora

_SQL_BASE = text(
    """
    SELECT percentile_cont(0.1) WITHIN GROUP (ORDER BY corriente_ma) AS bajo,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY corriente_ma) AS medio,
           percentile_cont(0.9) WITHIN GROUP (ORDER BY corriente_ma) AS alto,
           count(*) AS lecturas,
           count(DISTINCT (fecha_hora AT TIME ZONE 'America/Bogota')::date) AS dias
    FROM lecturas
    WHERE dispositivo_id = :d AND fecha_hora >= :desde AND fecha_hora < :hasta AND encendido AND corriente_ma >= :minimo
    """
)
_SQL_AHORA = text(
    """
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY corriente_ma) AS medio, count(*) AS lecturas
    FROM lecturas
    WHERE dispositivo_id = :d AND fecha_hora >= :desde AND fecha_hora <= :hasta AND encendido AND corriente_ma >= :minimo
    """
)


@dataclass(frozen=True)
class Base:
    bajo_ma: float
    normal_ma: float
    alto_ma: float
    lecturas: int
    dias: int

    @property
    def suficiente(self) -> bool:
        return self.lecturas >= LECTURAS_BASE_MINIMAS and self.dias >= DIAS_BASE_MINIMOS


@dataclass(frozen=True)
class Estado:
    estado: str  # "aprendiendo" (aún no sabe qué es lo normal), "apagado", "normal", "alta" o "baja"
    base: Base | None
    ahora_ma: float | None


_cache: dict[uuid.UUID, tuple[datetime, Base | None]] = {}


def base(db: Session, dispositivo_id: uuid.UUID, ahora: datetime, usar_cache: bool = True) -> Base | None:
    guardada = _cache.get(dispositivo_id)
    if usar_cache and guardada and timedelta(0) <= ahora - guardada[0] < CACHE_BASE:
        return guardada[1]
    hasta = ahora - SIN_LA_ULTIMA
    f = db.execute(_SQL_BASE, {"d": dispositivo_id, "desde": hasta - timedelta(days=DIAS_BASE), "hasta": hasta, "minimo": MA_CONSUMIENDO}).one()
    resultado = None if not f.lecturas else Base(float(f.bajo), float(f.medio), float(f.alto), int(f.lecturas), int(f.dias))
    _cache[dispositivo_id] = (ahora, resultado)
    return resultado


def ahora_ma(db: Session, dispositivo_id: uuid.UUID, ahora: datetime) -> float | None:
    f = db.execute(_SQL_AHORA, {"d": dispositivo_id, "desde": ahora - VENTANA, "hasta": ahora, "minimo": MA_CONSUMIENDO}).one()
    return float(f.medio) if f.lecturas >= LECTURAS_VENTANA_MINIMAS else None


def estado(db: Session, dispositivo_id: uuid.UUID, ahora: datetime | None = None, usar_cache: bool = True) -> Estado:
    ahora = ahora or datetime.now(UTC)
    b = base(db, dispositivo_id, ahora, usar_cache)
    actual = ahora_ma(db, dispositivo_id, ahora)
    if b is None or not b.suficiente:
        return Estado("aprendiendo", b, actual)
    if actual is None:
        return Estado("apagado", b, None)
    if actual > b.alto_ma * MARGEN_ALTO and actual - b.alto_ma >= DIFERENCIA_MINIMA_MA:
        return Estado("alta", b, actual)
    if actual < b.bajo_ma * MARGEN_BAJO and b.bajo_ma - actual >= DIFERENCIA_MINIMA_MA:
        return Estado("baja", b, actual)
    return Estado("normal", b, actual)


def amperios(ma: float) -> str:
    """0,82 A con coma decimal; por debajo de 1 A, dos decimales; si no, uno."""
    a = ma / 1000
    return (f"{a:.2f}" if a < 1 else f"{a:.1f}").replace(".", ",") + " A"
