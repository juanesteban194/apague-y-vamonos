"""Consolidado por hora y purga de lecturas crudas (CLAUDE.md: crudas 30 días; `consumo_horario` se guarda siempre).

Se recalcula una ventana hacia atrás en cada pasada (con upsert) en vez de solo "lo nuevo": si el agente estuvo sin internet y
reenvía lecturas de horas ya consolidadas, la siguiente pasada las corrige. La purga solo borra horas completas."""
import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.modules.consumo.costo import costo_de
from app.modules.consumo.energia import DIAS_CRUDOS, energia_por_cubeta, inicio_hora, inicio_mes_bogota
from app.modules.consumo.models import ConsumoHorario
from app.modules.consumo.service import precio_del_mes
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Hogar
from app.modules.ingesta.models import Lectura

log = logging.getLogger("jobs.consumo")

VENTANA_HORARIA = timedelta(hours=48)
VENTANA_DIARIA = timedelta(days=DIAS_CRUDOS - 1)  # un día menos que la retención: nunca recalcula una hora ya recortada
TAMANO_LOTE = 1000


def consolidar_horas(db: Session, ahora: datetime, ventana: timedelta = VENTANA_HORARIA) -> int:
    """Recalcula `consumo_horario` de las horas completas dentro de `ventana`. Devuelve cuántas filas escribió."""
    fin = inicio_hora(ahora)  # la hora en curso se consolida cuando termine
    inicio = fin - ventana
    escritas = 0
    for hogar in db.scalars(select(Hogar)):
        ids = list(db.scalars(select(Dispositivo.id).where(Dispositivo.hogar_id == hogar.id)))
        energia = energia_por_cubeta(db, ids, inicio, fin, "hour")
        if not energia:
            continue
        precios: dict[datetime, Decimal | None] = {}
        filas = []
        for (dispositivo_id, hora_local), kwh in energia.items():
            hora = hora_local.astimezone(UTC)
            mes = inicio_mes_bogota(hora)
            if mes not in precios:
                precios[mes] = precio_del_mes(db, hogar, ids, mes)[0]
            precio = precios[mes]
            filas.append({"dispositivo_id": dispositivo_id, "hora": hora, "kwh": kwh, "costo_cop": costo_de(kwh, precio) if precio else None})
        for i in range(0, len(filas), TAMANO_LOTE):
            lote = filas[i : i + TAMANO_LOTE]
            stmt = insert(ConsumoHorario).values(lote)
            db.execute(
                stmt.on_conflict_do_update(
                    index_elements=["dispositivo_id", "hora"],
                    set_={"kwh": stmt.excluded.kwh, "costo_cop": stmt.excluded.costo_cop},
                )
            )
        escritas += len(filas)
    db.commit()
    return escritas


def purgar_lecturas(db: Session, ahora: datetime) -> int:
    """Borra las lecturas crudas de hace más de 30 días, cortando en el inicio de una hora (nunca deja una hora a medias)."""
    corte = inicio_hora(ahora - timedelta(days=DIAS_CRUDOS))
    borradas = db.execute(delete(Lectura).where(Lectura.fecha_hora < corte)).rowcount
    db.commit()
    return borradas


def tarea_diaria(db: Session, ahora: datetime) -> tuple[int, int]:
    """Primero consolida los últimos 29 días (por si llegaron lecturas tardías) y solo después purga."""
    escritas = consolidar_horas(db, ahora, VENTANA_DIARIA)
    return escritas, purgar_lecturas(db, ahora)
