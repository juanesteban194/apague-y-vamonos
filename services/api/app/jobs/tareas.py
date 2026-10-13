"""Tareas programadas (CLAUDE.md): cada minuto alertas y rutinas, cada hora el consolidado, cada día prepago y purga.

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


def cada_minuto(ahora: datetime | None = None) -> None:
    """Evaluar reglas de alertas y ejecutar rutinas que vencen (se conectan en los siguientes pasos de la Fase 4)."""
    for nombre, trabajo in TAREAS_MINUTO:
        _ejecutar(nombre, trabajo, ahora)


def cada_hora(ahora: datetime | None = None) -> None:
    _ejecutar("consolidar_horas", lambda db, t: consolidacion.consolidar_horas(db, t), ahora)


def cada_dia(ahora: datetime | None = None) -> None:
    _ejecutar("consolidar_y_purgar", consolidacion.tarea_diaria, ahora)
    for nombre, trabajo in TAREAS_DIA:
        _ejecutar(nombre, trabajo, ahora)


# Se rellenan al importar cada módulo (alertas, rutinas, prepago) para que las tareas no dependan de ellos aquí.
TAREAS_MINUTO: list[tuple[str, Callable[[Session, datetime], object]]] = []
TAREAS_DIA: list[tuple[str, Callable[[Session, datetime], object]]] = []


def _registrar() -> None:
    from app.modules.alertas import notificar

    TAREAS_MINUTO.append(("alertas", notificar.evaluar_y_notificar))


_registrar()
