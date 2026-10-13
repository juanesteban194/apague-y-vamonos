"""Carga las equivalencias cotidianas (idempotente). Cada fila lleva su fuente; las de precio quedan APAGADAS hasta tener un precio real.

Aprobadas por el equipo el 2026-10-13: televisor (70 W, del mockup) y cargar el celular (≈ 15 Wh por carga, aproximado).
Pendientes de precio (no se inventan): hamburguesa y caja de leche. Para activarlas: poner `costo_cop`, la fuente y `activa=True`.

Uso (desde services/api):  .venv/bin/python seeds/equivalencias.py
"""
from datetime import date

from sqlalchemy.dialects.postgresql import insert

from app.core.database import get_sessionmaker
from app.modules.consumo.models import Equivalencia

HOY = date(2026, 10, 13)
EQUIVALENCIAS = [
    dict(nombre="televisor", tipo="energia", wh_por_unidad=70.0, plantilla_singular="dejar el televisor de la sala prendido {n} hora",
         plantilla_plural="dejar el televisor de la sala prendido {n} horas", icono="tv", activa=True,
         fuente="Mockup del equipo: televisor de la sala, 70 W (70 Wh por hora)"),
    dict(nombre="celular", tipo="energia", wh_por_unidad=15.0, plantilla_singular="cargar el celular {n} vez", plantilla_plural="cargar el celular {n} veces",
         icono="plug", activa=True, fuente="Aproximado aprobado por el equipo: ≈ 15 Wh por carga (batería típica de 4.000 a 5.000 mAh)"),
    dict(nombre="hamburguesa", tipo="precio", costo_cop=None, plantilla_singular="comerse {n} hamburguesa", plantilla_plural="comerse {n} hamburguesas",
         icono="burger", activa=False, fuente="PENDIENTE: precio de una hamburguesa en la ciudad del hogar (sin fuente verificada)"),
    dict(nombre="leche", tipo="precio", costo_cop=None, plantilla_singular="comprar {n} caja de leche", plantilla_plural="comprar {n} cajas de leche",
         icono="milk", activa=False, fuente="PENDIENTE: precio de una caja de leche de 1 litro (sin fuente verificada)"),
]


def main() -> None:
    filas = [{"vigente_desde": HOY, "costo_cop": None, "wh_por_unidad": None, **e} for e in EQUIVALENCIAS]
    with get_sessionmaker()() as db:
        stmt = insert(Equivalencia).values(filas)
        # Repetir el seed actualiza textos y energía, pero NO apaga ni cambia el precio que el equipo ya haya cargado.
        db.execute(
            stmt.on_conflict_do_update(
                index_elements=["nombre"],
                set_={"plantilla_singular": stmt.excluded.plantilla_singular, "plantilla_plural": stmt.excluded.plantilla_plural, "icono": stmt.excluded.icono},
            )
        )
        db.commit()
    print(f"{len(filas)} equivalencias cargadas (activas: {sum(e['activa'] for e in EQUIVALENCIAS)})")


if __name__ == "__main__":
    main()
