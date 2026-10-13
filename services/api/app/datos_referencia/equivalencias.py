"""Equivalencias cotidianas (docs/decisiones/0006). Las de precio llevan su fuente; una sin precio verificado queda PENDIENTE y apagada."""
from datetime import date

from sqlalchemy import case
from sqlalchemy.dialects.postgresql import insert

from app.modules.consumo.models import Equivalencia

HOY = date(2026, 10, 13)
EQUIVALENCIAS = [
    dict(nombre="televisor", tipo="energia", wh_por_unidad=70.0, plantilla_singular="dejar el televisor de la sala prendido {n} hora",
         plantilla_plural="dejar el televisor de la sala prendido {n} horas", icono="tv", activa=True,
         fuente="Mockup del equipo: televisor de la sala, 70 W (70 Wh por hora)"),
    dict(nombre="celular", tipo="energia", wh_por_unidad=15.0, plantilla_singular="cargar el celular {n} vez", plantilla_plural="cargar el celular {n} veces",
         icono="plug", activa=True, fuente="Aproximado aprobado por el equipo: ≈ 15 Wh por carga (batería típica de 4.000 a 5.000 mAh)"),
    dict(nombre="hamburguesa", tipo="precio", costo_cop=32900, plantilla_singular="comerse {n} Big Mac", plantilla_plural="comerse {n} Big Mac",
         icono="burger", activa=True, fuente="Big Mac de McDonald's en Rappi (Medellín), $32.900, consultado el 2026-10-13; el precio de Rappi puede ser mayor al del restaurante"),
    dict(nombre="leche", tipo="precio", costo_cop=7500, plantilla_singular="comprar {n} caja de leche", plantilla_plural="comprar {n} cajas de leche",
         icono="milk", activa=True, fuente="Colanta Leche Entera, caja de 1 litro, en Rappi (Turbo, Medellín), $7.500, consultado el 2026-10-13; el precio de Rappi puede ser mayor al del supermercado"),
]


def cargar(db) -> int:
    filas = [{"vigente_desde": HOY, "costo_cop": None, "wh_por_unidad": None, **e} for e in EQUIVALENCIAS]
    stmt = insert(Equivalencia).values(filas)
    # Repetirlo actualiza los textos. El precio, la fuente y el estado solo se llenan mientras la fila esté PENDIENTE: si el equipo
    # ya cargó o cambió un precio a mano, no se pisa.
    pendiente = Equivalencia.fuente.like("PENDIENTE%")
    db.execute(
        stmt.on_conflict_do_update(
            index_elements=["nombre"],
            set_={
                "plantilla_singular": stmt.excluded.plantilla_singular, "plantilla_plural": stmt.excluded.plantilla_plural, "icono": stmt.excluded.icono,
                "costo_cop": case((pendiente, stmt.excluded.costo_cop), else_=Equivalencia.costo_cop),
                "activa": case((pendiente, stmt.excluded.activa), else_=Equivalencia.activa),
                "fuente": case((pendiente, stmt.excluded.fuente), else_=Equivalencia.fuente),
            },
        )
    )
    db.commit()
    return len(filas)
