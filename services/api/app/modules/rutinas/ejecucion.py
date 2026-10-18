"""Ejecución de las rutinas (tarea de cada minuto). Una rutina apaga un dispositivo a una hora y, si tiene hora de encendido, lo vuelve a prender.

Cada ejecución se reclama primero insertando su evento (restricción única rutina+acción+horario): así, aunque la tarea corra dos veces
o haya dos procesos, el comando sale una sola vez. Se tolera hasta 5 minutos de atraso (API dormida que acaba de despertar)."""
import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.modules.alertas import notificar, service as alertas
from app.modules.dispositivos.control import ejecutar_comando
from app.modules.dispositivos.models import Dispositivo
from app.modules.rutinas import service
from app.modules.rutinas.models import EventoRutina, Rutina
from app.realtime.manager import gestor

log = logging.getLogger("rutinas")
BOGOTA = ZoneInfo("America/Bogota")
GRACIA = timedelta(minutes=5)

# (hogar_id, dispositivo_id, tuya_id, accion) -> (ok, detalle)
Enviar = Callable[[object, object, str, str], tuple[bool, str | None]]


def enviar_por_la_api(hogar_id, dispositivo_id, tuya_id: str, accion: str) -> tuple[bool, str | None]:
    """Manda el comando por el mismo camino que el botón de la app (agente primero, Tuya Cloud de respaldo)."""
    bucle = gestor._bucle
    if bucle is None:
        return False, "El servidor todavía está arrancando."
    try:
        asyncio.run_coroutine_threadsafe(ejecutar_comando(hogar_id, dispositivo_id, tuya_id, accion), bucle).result(timeout=20)
        return True, None
    except HTTPException as e:
        return False, str(e.detail)
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def horarios_pendientes(rutinas: list[Rutina], ahora: datetime) -> list[tuple[Rutina, str, datetime]]:
    """(rutina, acción, hora programada) que vencen ahora: programada ≤ ahora < programada + 5 min y el día de la rutina corresponde.

    Los días de una rutina son los del APAGADO. Si el encendido es "antes" que el apagado (apaga a las 23:00, enciende a las 06:00),
    el encendido ocurre al día siguiente y le corresponde el día anterior."""
    local = ahora.astimezone(BOGOTA)
    resultado = []
    for rutina in rutinas:
        cruza = rutina.hora_encendido is not None and rutina.hora_encendido < rutina.hora_apagado
        for accion, hora in (("apagar", rutina.hora_apagado), ("encender", rutina.hora_encendido)):
            if hora is None:
                continue
            for atras in (0, 1):  # hoy y ayer (por si la tolerancia cruza la medianoche)
                fecha: date = local.date() - timedelta(days=atras)
                programada = datetime.combine(fecha, hora, BOGOTA)
                if not (programada <= local < programada + GRACIA):
                    continue
                dia_de_la_rutina = fecha - timedelta(days=1) if (accion == "encender" and cruza) else fecha
                if dia_de_la_rutina.weekday() in rutina.dias:
                    resultado.append((rutina, accion, programada.astimezone(UTC)))
    return resultado


def ejecutar_vencidas(db: Session, ahora: datetime, enviar: Enviar = enviar_por_la_api) -> int:
    rutinas = list(db.scalars(select(Rutina).where(Rutina.activa.is_(True))))
    hechas = 0
    for rutina, accion, programada in horarios_pendientes(rutinas, ahora):
        reclamo = db.execute(
            insert(EventoRutina)
            .values(rutina_id=rutina.id, accion=accion, programada_en=programada, ejecutado_en=ahora, resultado="pendiente")
            .on_conflict_do_nothing(index_elements=["rutina_id", "accion", "programada_en"])
            .returning(EventoRutina.id)
        ).scalar()
        db.commit()
        if reclamo is None:
            continue  # ya se ejecutó (o la está ejecutando otro proceso)
        dispositivo = db.get(Dispositivo, rutina.dispositivo_id)
        ok, detalle = enviar(dispositivo.hogar_id, dispositivo.id, dispositivo.tuya_id, accion)
        kwh = service.kwh_evitados_por_ejecucion(db, rutina, ahora) if ok and accion == "apagar" else None
        db.execute(update(EventoRutina).where(EventoRutina.id == reclamo).values(resultado="ok" if ok else f"error: {detalle}"[:200], kwh_evitados=kwh))
        db.commit()
        hechas += 1
        log.info("rutina %s %s (%s): %s", dispositivo.nombre, accion, programada.isoformat(), "ok" if ok else detalle)
        if not ok:
            alerta = alertas.crear(
                db, dispositivo.hogar_id, "rutina", "amarillo", f"No pudimos {accion} {dispositivo.nombre}",
                f"La rutina de las {programada.astimezone(BOGOTA):%H:%M} no se cumplió. {detalle}", dispositivo.id,
                sin_repetir_desde=programada, ahora=ahora,
            )
            if alerta:
                notificar.notificar(db, [alerta])
    return hechas
