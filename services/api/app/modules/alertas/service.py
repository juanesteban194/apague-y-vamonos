import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.modules.alertas.models import Alerta, PreferenciaAlertas, TokenPush
from app.modules.alertas.schemas import AlertaOut
from app.modules.dispositivos.models import Dispositivo

# Qué niveles llegan según cuántos avisos quiere la persona (mockup: "Pocas / Normales / Muchas").
NIVELES_POR_SENSIBILIDAD = {
    "pocos": {"rojo"},
    "normal": {"rojo", "amarillo"},
    "todos": {"rojo", "amarillo", "verde"},
}


def sensibilidad_de(db: Session, hogar_id: uuid.UUID) -> str:
    pref = db.get(PreferenciaAlertas, hogar_id)
    return pref.sensibilidad if pref else "normal"


def guardar_sensibilidad(db: Session, hogar_id: uuid.UUID, sensibilidad: str) -> str:
    pref = db.get(PreferenciaAlertas, hogar_id)
    if pref is None:
        db.add(PreferenciaAlertas(hogar_id=hogar_id, sensibilidad=sensibilidad))
    else:
        pref.sensibilidad = sensibilidad
    db.commit()
    return sensibilidad


def crear(
    db: Session,
    hogar_id: uuid.UUID,
    tipo: str,
    nivel: str,
    titulo: str,
    mensaje: str,
    dispositivo_id: uuid.UUID | None = None,
    sin_repetir_desde: datetime | None = None,
    ahora: datetime | None = None,
) -> Alerta | None:
    """Crea el aviso si la sensibilidad del hogar lo permite y no hay otro igual dentro del mismo episodio
    (`sin_repetir_desde`: inicio del episodio o del mes). Devuelve None si no se creó."""
    if nivel not in NIVELES_POR_SENSIBILIDAD[sensibilidad_de(db, hogar_id)]:
        return None
    if sin_repetir_desde is not None:
        existente = db.scalar(
            select(Alerta.id).where(
                Alerta.hogar_id == hogar_id,
                Alerta.tipo == tipo,
                Alerta.nivel == nivel,
                Alerta.dispositivo_id == dispositivo_id if dispositivo_id else Alerta.dispositivo_id.is_(None),
                Alerta.fecha >= sin_repetir_desde,
            )
        )
        if existente is not None:
            return None
    alerta = Alerta(
        hogar_id=hogar_id, dispositivo_id=dispositivo_id, tipo=tipo, nivel=nivel, titulo=titulo, mensaje=mensaje, fecha=ahora or datetime.now(UTC)
    )
    db.add(alerta)
    db.commit()
    return alerta


def a_salida(alerta: Alerta, nombre_dispositivo: str | None) -> AlertaOut:
    return AlertaOut(
        id=alerta.id,
        dispositivo_id=alerta.dispositivo_id,
        dispositivo_nombre=nombre_dispositivo,
        tipo=alerta.tipo,
        nivel=alerta.nivel,
        titulo=alerta.titulo,
        mensaje=alerta.mensaje,
        fecha=alerta.fecha,
        leida=alerta.leida,
    )


def listar(db: Session, hogar_id: uuid.UUID, solo_no_leidas: bool = False, limite: int = 50) -> list[AlertaOut]:
    consulta = (
        select(Alerta, Dispositivo.nombre)
        .outerjoin(Dispositivo, Dispositivo.id == Alerta.dispositivo_id)
        .where(Alerta.hogar_id == hogar_id, Alerta.eliminada.is_(False))
        .order_by(Alerta.fecha.desc())
        .limit(limite)
    )
    if solo_no_leidas:
        consulta = consulta.where(Alerta.leida.is_(False))
    return [a_salida(a, nombre) for a, nombre in db.execute(consulta)]


def marcar_leida(db: Session, hogar_id: uuid.UUID, alerta_id: uuid.UUID) -> bool:
    resultado = db.execute(update(Alerta).where(Alerta.id == alerta_id, Alerta.hogar_id == hogar_id).values(leida=True))
    db.commit()
    return resultado.rowcount > 0


def eliminar(db: Session, hogar_id: uuid.UUID, alerta_id: uuid.UUID) -> str:
    """Esconde un aviso ya leído. Devuelve "ok", "no_existe" o "sin_leer" (los sin leer no se eliminan: primero hay que verlos)."""
    alerta = db.scalar(select(Alerta).where(Alerta.id == alerta_id, Alerta.hogar_id == hogar_id, Alerta.eliminada.is_(False)))
    if alerta is None:
        return "no_existe"
    if not alerta.leida:
        return "sin_leer"
    alerta.eliminada = True
    db.commit()
    return "ok"


def eliminar_leidas(db: Session, hogar_id: uuid.UUID) -> int:
    """Esconde todos los avisos ya leídos de la casa; los sin leer se quedan."""
    n = db.execute(
        update(Alerta).where(Alerta.hogar_id == hogar_id, Alerta.leida.is_(True), Alerta.eliminada.is_(False)).values(eliminada=True)
    ).rowcount
    db.commit()
    return n


def marcar_todas_leidas(db: Session, hogar_id: uuid.UUID) -> int:
    n = db.execute(update(Alerta).where(Alerta.hogar_id == hogar_id, Alerta.leida.is_(False)).values(leida=True)).rowcount
    db.commit()
    return n


def guardar_token_push(db: Session, usuario_id: uuid.UUID, token: str, plataforma: str) -> None:
    """Un celular = un token. Si cambió de dueño (otra cuenta en el mismo teléfono), pasa a la cuenta actual."""
    existente = db.scalar(select(TokenPush).where(TokenPush.token_expo == token))
    if existente is None:
        db.add(TokenPush(usuario_id=usuario_id, token_expo=token, plataforma=plataforma))
    else:
        existente.usuario_id, existente.plataforma = usuario_id, plataforma
    db.commit()


def borrar_token_push(db: Session, usuario_id: uuid.UUID, token: str) -> None:
    db.execute(delete(TokenPush).where(TokenPush.token_expo == token, TokenPush.usuario_id == usuario_id))
    db.commit()
