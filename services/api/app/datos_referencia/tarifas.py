"""Tarifas EPM por estrato y mes (docs/decisiones/0002). Cada mes: añadir el bloque de la nueva publicación."""
from datetime import date

from sqlalchemy.dialects.postgresql import insert

from app.modules.tarifas.models import Tarifa

FUENTE_2026_09 = (
    "EPM, Tarifas y Costo de Energía Eléctrica - Mercado Regulado, septiembre de 2026 "
    "(publicación del 16-sep-2026), Antioquia, Nivel I, columna Propiedad EPM"
)

# estrato: (COP/kWh hasta subsistencia, COP/kWh sobre subsistencia)
TARIFAS = {
    date(2026, 9, 1): {
        1: ("425.51", "958.38"),
        2: ("531.88", "958.38"),
        3: ("814.63", "958.38"),
        4: ("958.38", "958.38"),  # estrato 4: todo el consumo al mismo valor
        5: ("1150.06", "1150.06"),  # estratos 5 y 6: todo el consumo
        6: ("1150.06", "1150.06"),
    },
}
FUENTES = {date(2026, 9, 1): FUENTE_2026_09}


def cargar(db) -> int:
    filas = [
        {"estrato": e, "mes": mes, "cop_kwh_subsistencia": sub, "cop_kwh_sobre_subsistencia": sobre, "fuente": FUENTES[mes]}
        for mes, por_estrato in TARIFAS.items()
        for e, (sub, sobre) in por_estrato.items()
    ]
    stmt = insert(Tarifa).values(filas)
    stmt = stmt.on_conflict_do_update(
        index_elements=["estrato", "mes"],
        set_={
            "cop_kwh_subsistencia": stmt.excluded.cop_kwh_subsistencia,
            "cop_kwh_sobre_subsistencia": stmt.excluded.cop_kwh_sobre_subsistencia,
            "fuente": stmt.excluded.fuente,
        },
    )
    db.execute(stmt)
    db.commit()
    return len(filas)
