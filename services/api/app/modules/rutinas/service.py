import uuid
from datetime import UTC, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.consumo.energia import inicio_mes_bogota
from app.modules.consumo.service import precio_del_mes
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Hogar
from app.modules.ingesta.models import Lectura
from app.modules.rutinas.models import EventoRutina, Rutina
from app.modules.rutinas.schemas import RutinaIn, RutinaOut, UltimaEjecucion

SEMANAS_POR_MES = 52 / 12
DIAS_PARA_POTENCIA = 7


def horas_apagado(apagado: time, encendido: time) -> float:
    """Horas entre apagar y volver a encender (cruza la medianoche si el encendido es "antes" que el apagado)."""
    a = apagado.hour * 60 + apagado.minute
    e = encendido.hour * 60 + encendido.minute
    return ((e - a) % (24 * 60)) / 60


def potencia_media_encendido(db: Session, dispositivo_id: uuid.UUID, ahora: datetime) -> float | None:
    """Vatios promedio del aparato mientras estuvo consumiendo en los últimos 7 días (para estimar lo que ahorra apagarlo)."""
    return db.scalar(
        select(func.avg(Lectura.potencia_w)).where(
            Lectura.dispositivo_id == dispositivo_id, Lectura.fecha_hora >= ahora - timedelta(days=DIAS_PARA_POTENCIA), Lectura.encendido.is_(True), Lectura.potencia_w > 0
        )
    )


def kwh_evitados_por_ejecucion(db: Session, rutina: Rutina, ahora: datetime) -> float | None:
    if rutina.hora_encendido is None:
        return None  # sin hora de encendido no se sabe cuánto dura el apagado
    vatios = potencia_media_encendido(db, rutina.dispositivo_id, ahora)
    if vatios is None:
        return None
    return vatios / 1000 * horas_apagado(rutina.hora_apagado, rutina.hora_encendido)


def _salida(db: Session, rutina: Rutina, dispositivo: Dispositivo, ahora: datetime) -> RutinaOut:
    ahorro = None
    kwh = kwh_evitados_por_ejecucion(db, rutina, ahora)
    if kwh is not None:
        hogar = db.get(Hogar, dispositivo.hogar_id)
        ids = list(db.scalars(select(Dispositivo.id).where(Dispositivo.hogar_id == hogar.id)))
        precio = precio_del_mes(db, hogar, ids, inicio_mes_bogota(ahora))[0]
        if precio:
            ahorro = round(kwh * len(rutina.dias) * SEMANAS_POR_MES * float(precio), 2)
    ultima = db.scalar(select(EventoRutina).where(EventoRutina.rutina_id == rutina.id, EventoRutina.resultado != "pendiente").order_by(EventoRutina.ejecutado_en.desc()).limit(1))
    return RutinaOut(
        id=rutina.id, dispositivo_id=rutina.dispositivo_id, dispositivo_nombre=dispositivo.nombre, dias=sorted(rutina.dias),
        hora_apagado=rutina.hora_apagado, hora_encendido=rutina.hora_encendido, activa=rutina.activa, ahorro_estimado_cop_mes=ahorro,
        ultima_ejecucion=UltimaEjecucion(cuando=ultima.ejecutado_en, accion=ultima.accion, resultado=ultima.resultado) if ultima else None,
    )


def _dispositivo_del_hogar(db: Session, hogar_id: uuid.UUID, dispositivo_id: uuid.UUID) -> Dispositivo:
    d = db.get(Dispositivo, dispositivo_id)
    if d is None or d.hogar_id != hogar_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Ese aparato no es de tu hogar")
    return d


def _rutina_del_hogar(db: Session, hogar_id: uuid.UUID, rutina_id: uuid.UUID) -> tuple[Rutina, Dispositivo]:
    fila = db.execute(select(Rutina, Dispositivo).join(Dispositivo, Dispositivo.id == Rutina.dispositivo_id).where(Rutina.id == rutina_id, Dispositivo.hogar_id == hogar_id)).first()
    if fila is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rutina no encontrada")
    return fila


def listar(db: Session, hogar_id: uuid.UUID) -> list[RutinaOut]:
    ahora = datetime.now(UTC)
    filas = db.execute(select(Rutina, Dispositivo).join(Dispositivo, Dispositivo.id == Rutina.dispositivo_id).where(Dispositivo.hogar_id == hogar_id).order_by(Rutina.hora_apagado))
    return [_salida(db, r, d, ahora) for r, d in filas]


def crear(db: Session, hogar_id: uuid.UUID, datos: RutinaIn) -> RutinaOut:
    dispositivo = _dispositivo_del_hogar(db, hogar_id, datos.dispositivo_id)
    rutina = Rutina(**datos.model_dump())
    db.add(rutina)
    db.commit()
    return _salida(db, rutina, dispositivo, datetime.now(UTC))


def actualizar(db: Session, hogar_id: uuid.UUID, rutina_id: uuid.UUID, datos: RutinaIn) -> RutinaOut:
    rutina, _ = _rutina_del_hogar(db, hogar_id, rutina_id)
    dispositivo = _dispositivo_del_hogar(db, hogar_id, datos.dispositivo_id)
    for campo, valor in datos.model_dump().items():
        setattr(rutina, campo, valor)
    db.commit()
    return _salida(db, rutina, dispositivo, datetime.now(UTC))


def borrar(db: Session, hogar_id: uuid.UUID, rutina_id: uuid.UUID) -> None:
    rutina, _ = _rutina_del_hogar(db, hogar_id, rutina_id)
    db.delete(rutina)
    db.commit()
