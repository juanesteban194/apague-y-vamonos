import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.dispositivos.models import Dispositivo
from app.modules.dispositivos.schemas import DispositivoIn


def crear(db: Session, hogar_id: uuid.UUID, datos: DispositivoIn) -> Dispositivo:
    dispositivo = Dispositivo(hogar_id=hogar_id, **datos.model_dump())
    db.add(dispositivo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ese ID de Tuya ya está registrado") from None
    return dispositivo


def listar(db: Session, hogar_id: uuid.UUID) -> list[Dispositivo]:
    return list(db.scalars(select(Dispositivo).where(Dispositivo.hogar_id == hogar_id).order_by(Dispositivo.creado_en)))
