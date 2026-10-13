"""Datos de referencia que la API carga sola al arrancar (idempotente): tarifas EPM y equivalencias.

Así un despliegue nuevo siempre tiene lo que necesita, sin depender de que alguien corra un script desde su computador."""
import logging

from app.core.database import get_sessionmaker
from app.datos_referencia import equivalencias, tarifas

log = logging.getLogger("datos_referencia")


def cargar_todo() -> None:
    """Nunca lanza: si la base no está lista, la API arranca igual y el próximo arranque lo reintenta."""
    try:
        with get_sessionmaker()() as db:
            log.info("datos de referencia: %d tarifas, %d equivalencias", tarifas.cargar(db), equivalencias.cargar(db))
    except Exception:
        log.exception("no se pudieron cargar los datos de referencia")
