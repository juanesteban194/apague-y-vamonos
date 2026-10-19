"""Tareas programadas (requisitos del proyecto): cada minuto alertas y rutinas, cada hora el consolidado, cada día prepago y purga.

Cada tarea abre su propia sesión y nunca deja escapar una excepción: un fallo se registra y la siguiente pasada lo reintenta,
sin tumbar el planificador. En Render gratuito la API duerme sin tráfico; mientras el agente envía lecturas está despierta."""
import logging
from collections.abc import Callable
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.database import get_sessionmaker
from app.modules.consumo import consolidacion

log = logging.getLogger("jobs")


def _ejecutar(nombre: str, trabajo: Callable[[Session, datetime], object], ahora: datetime | None = None) -> None:
    ahora = ahora or datetime.now(UTC)
    try:
        with get_sessionmaker()() as db:
            resultado = trabajo(db, ahora)
        log.info("tarea %s: %s", nombre, resultado)
    except Exception:
        log.exception("tarea %s falló; se reintenta en la siguiente pasada", nombre)


def cada_20_segundos(ahora: datetime | None = None) -> None:
    """Evaluar las reglas de avisos. Con una pasada por minuto el aviso podía tardar casi 60 s tras cruzar el umbral (requisito
    pide ≤ 60 s): cada 20 s el retraso máximo queda en ~20 s."""
    for nombre, trabajo in TAREAS_20S:
        _ejecutar(nombre, trabajo, ahora)


def cada_minuto(ahora: datetime | None = None) -> None:
    """Ejecutar las rutinas que vencen (tolerancia de 5 minutos: no necesitan más frecuencia) y revisar si la corriente de algún
    enchufe se salió de lo normal (mira 15 minutos seguidos: no hace falta más frecuencia)."""
    for nombre, trabajo in TAREAS_MINUTO:
        _ejecutar(nombre, trabajo, ahora)


def cada_hora(ahora: datetime | None = None) -> None:
    _ejecutar("consolidar_horas", lambda db, t: consolidacion.consolidar_horas(db, t), ahora)
    from app.modules.alertas import notificar

    _ejecutar("consumo_anomalo", notificar.evaluar_anomalias_y_notificar, ahora)


def cada_dia(ahora: datetime | None = None) -> None:
    _ejecutar("consolidar_y_purgar", consolidacion.tarea_diaria, ahora)
    for nombre, trabajo in TAREAS_DIA:
        _ejecutar(nombre, trabajo, ahora)


# Se rellenan al importar cada módulo (alertas, rutinas, prepago) para que las tareas no dependan de ellos aquí.
TAREAS_20S: list[tuple[str, Callable[[Session, datetime], object]]] = []
TAREAS_MINUTO: list[tuple[str, Callable[[Session, datetime], object]]] = []
TAREAS_DIA: list[tuple[str, Callable[[Session, datetime], object]]] = []


def _registrar() -> None:
    from app.modules.alertas import notificar

    from app.modules.rutinas import ejecucion

    TAREAS_20S.append(("alertas", notificar.evaluar_y_notificar))
    TAREAS_MINUTO.append(("rutinas", lambda db, ahora: ejecucion.ejecutar_vencidas(db, ahora)))
    TAREAS_MINUTO.append(("otro_dispositivo", notificar.evaluar_otro_dispositivo_y_notificar))


_registrar()
