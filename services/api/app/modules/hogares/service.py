import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import generar_token_agente, hash_token_agente
from app.modules.alertas.models import PreferenciaAlertas
from app.modules.hogares.models import Agente, Hogar, MiembroHogar
from app.modules.hogares.schemas import AgenteIn, HogarIn


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
