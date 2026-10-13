"""Carga las equivalencias cotidianas (idempotente). Los valores y su fuente viven en app/datos_referencia/equivalencias.py.

Aprobadas por el equipo el 2026-10-13: televisor (70 W) y cargar el celular (≈ 15 Wh por carga). Con precio de Rappi Medellín (2026-10-13): Big Mac y
caja de leche. Para cambiar un precio, actualiza `costo_cop` y `fuente` en la tabla (el seed no pisa lo ya cargado). La API también las carga sola al arrancar.

Uso (desde services/api):  .venv/bin/python seeds/equivalencias.py
"""
from app.core.database import get_sessionmaker
from app.datos_referencia.equivalencias import EQUIVALENCIAS, cargar


def main() -> None:
    with get_sessionmaker()() as db:
        print(f"{cargar(db)} equivalencias cargadas (activas: {sum(e['activa'] for e in EQUIVALENCIAS)})")


if __name__ == "__main__":
    main()
