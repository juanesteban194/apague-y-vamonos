"""Carga la tarifa EPM del mes en la tabla `tarifas` (idempotente: repetirla actualiza).

Los valores viven en app/datos_referencia/tarifas.py (docs/decisiones/0002). La API también los carga sola al arrancar.

Uso (desde services/api; usa DATABASE_URL del entorno o .env):
    .venv/bin/python seeds/tarifas.py
"""
from app.core.database import get_sessionmaker
from app.datos_referencia.tarifas import cargar


def main() -> None:
    with get_sessionmaker()() as db:
        print(f"{cargar(db)} tarifas cargadas")


if __name__ == "__main__":
    main()
