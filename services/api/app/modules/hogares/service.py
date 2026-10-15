import uuid
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import generar_token_agente, hash_token_agente
from app.modules.alertas.models import PreferenciaAlertas
from app.modules.hogares.models import Agente, Hogar, LecturaMedidor, MiembroHogar
from app.modules.hogares.schemas import AgenteIn, AgenteOut, EnchufeDeAgenteOut, HogarActualizarIn, HogarIn, LecturaMedidorIn


def exigir_miembro(db: Session, usuario_id: uuid.UUID, hogar_id: uuid.UUID, rol: str | None = None) -> MiembroHogar:
    """Verifica que el usuario pertenece al hogar (y, opcionalmente, con ese rol)."""
    miembro = db.get(MiembroHogar, (usuario_id, hogar_id))
    if miembro is None or (rol is not None and miembro.rol != rol):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes acceso a este hogar")
    return miembro


def crear_hogar(db: Session, usuario_id: uuid.UUID, datos: HogarIn) -> tuple[Hogar, str]:
    hogar = Hogar(**datos.model_dump())
    db.add(hogar)
    db.flush()
    db.add(MiembroHogar(usuario_id=usuario_id, hogar_id=hogar.id, rol="titular"))
    db.add(PreferenciaAlertas(hogar_id=hogar.id))
    db.commit()
    return hogar, "titular"


def listar_hogares(db: Session, usuario_id: uuid.UUID) -> list[tuple[Hogar, str]]:
    filas = db.execute(
        select(Hogar, MiembroHogar.rol)
        .join(MiembroHogar, MiembroHogar.hogar_id == Hogar.id)
        .where(MiembroHogar.usuario_id == usuario_id)
        .order_by(Hogar.creado_en)
    )
    return [(h, rol) for h, rol in filas]


def crear_agente(db: Session, hogar_id: uuid.UUID, datos: AgenteIn) -> tuple[Agente, str]:
    token = generar_token_agente()
    agente = Agente(hogar_id=hogar_id, nombre=datos.nombre, token_hash=hash_token_agente(token))
    db.add(agente)
    db.commit()
    return agente, token


def actualizar_hogar(db: Session, hogar: Hogar, datos: HogarActualizarIn) -> Hogar:
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        if valor is None and campo in ("nombre", "estrato"):
            continue  # obligatorios: null no los borra
        setattr(hogar, campo, valor)
    db.commit()
    return hogar


def listar_agentes(db: Session, hogar_id: uuid.UUID) -> list[Agente]:
    return list(db.scalars(select(Agente).where(Agente.hogar_id == hogar_id).order_by(Agente.creado_en)))


def agentes_con_enchufes(db: Session, hogar_id: uuid.UUID) -> list[AgenteOut]:
    """Los agentes de la casa con los enchufes que lee cada uno y si están conectados ahora mismo."""
    from app.modules.dispositivos.models import Dispositivo
    from app.realtime.agentes import gestor_agentes

    enchufes: dict[uuid.UUID, list[EnchufeDeAgenteOut]] = {}
    for d in db.scalars(select(Dispositivo).where(Dispositivo.hogar_id == hogar_id, Dispositivo.agente_id.is_not(None)).order_by(Dispositivo.creado_en)):
        enchufes.setdefault(d.agente_id, []).append(EnchufeDeAgenteOut(id=d.id, nombre=d.nombre))
    return [
        AgenteOut(
            id=a.id, nombre=a.nombre, ultima_conexion=a.ultima_conexion, creado_en=a.creado_en,
            codigo_pendiente=a.codigo_hash is not None and a.codigo_expira_en is not None and a.codigo_expira_en > datetime.now(UTC),
            vinculado=a.token_hash is not None, conectado=gestor_agentes.conectado(hogar_id, a.id), enchufes=enchufes.get(a.id, []),
        )
        for a in listar_agentes(db, hogar_id)
    ]


def renombrar_agente(db: Session, hogar_id: uuid.UUID, agente_id: uuid.UUID, nombre: str) -> Agente:
    agente = db.get(Agente, agente_id)
    if agente is None or agente.hogar_id != hogar_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agente no encontrado")
    agente.nombre = nombre
    db.commit()
    return agente


def revocar_agente(db: Session, hogar_id: uuid.UUID, agente_id: uuid.UUID) -> None:
    agente = db.get(Agente, agente_id)
    if agente is None or agente.hogar_id != hogar_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agente no encontrado")
    db.delete(agente)
    db.commit()


def borrar_hogar(db: Session, hogar_id: uuid.UUID) -> None:
    """Borra la casa con todo lo suyo (enchufes, lecturas, agentes, avisos, prepago, rutinas, facturas…): las llaves foráneas lo hacen en cascada."""
    hogar = db.get(Hogar, hogar_id)
    if hogar is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa no encontrada")
    db.delete(hogar)
    db.commit()


def borrar_lectura_medidor(db: Session, hogar_id: uuid.UUID, lectura_id: uuid.UUID) -> None:
    lectura = db.get(LecturaMedidor, lectura_id)
    if lectura is None or lectura.hogar_id != hogar_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lectura no encontrada")
    db.delete(lectura)
    db.commit()


def registrar_lectura_medidor(db: Session, hogar_id: uuid.UUID, datos: LecturaMedidorIn) -> LecturaMedidor:
    """Lectura del medidor de EPM (HU-07). El contador solo sube: una lectura menor que la última es casi seguro un error de digitación."""
    fecha = datos.fecha or datetime.now(ZoneInfo("America/Bogota")).date()
    anterior = db.scalar(
        select(LecturaMedidor).where(LecturaMedidor.hogar_id == hogar_id, LecturaMedidor.fecha <= fecha).order_by(LecturaMedidor.fecha.desc(), LecturaMedidor.lectura_kwh.desc()).limit(1)
    )
    if anterior is not None and datos.lectura_kwh < anterior.lectura_kwh:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"La lectura no puede ser menor que la anterior ({anterior.lectura_kwh:g}).")
    lectura = LecturaMedidor(hogar_id=hogar_id, lectura_kwh=datos.lectura_kwh, fecha=fecha)
    db.add(lectura)
    db.commit()
    return lectura


def listar_lecturas_medidor(db: Session, hogar_id: uuid.UUID) -> list[LecturaMedidor]:
    return list(db.scalars(select(LecturaMedidor).where(LecturaMedidor.hogar_id == hogar_id).order_by(LecturaMedidor.fecha.desc(), LecturaMedidor.lectura_kwh.desc()).limit(24)))
