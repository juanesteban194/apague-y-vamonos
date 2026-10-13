"""Carga las equivalencias cotidianas (idempotente). Los valores y su fuente viven en app/datos_referencia/equivalencias.py.

Aprobadas por el equipo el 2026-10-13: televisor (70 W) y cargar el celular (≈ 15 Wh por carga). Pendientes de precio (no se inventan): hamburguesa y
caja de leche; para activarlas basta poner `costo_cop`, la fuente y `activa=True` en la tabla. La API también las carga sola al arrancar.

Uso (desde services/api):  .venv/bin/python seeds/equivalencias.py
"""
from app.core.database import get_sessionmaker
from app.datos_referencia.equivalencias import EQUIVALENCIAS, cargar


def main() -> None:
    with get_sessionmaker()() as db:
        print(f"{cargar(db)} equivalencias cargadas (activas: {sum(e['activa'] for e in EQUIVALENCIAS)})")


if __name__ == "__main__":
    main()
