import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.dispositivos.models import Dispositivo
from app.modules.dispositivos.schemas import DispositivoActualizarIn, DispositivoIn


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


def obtener(db: Session, hogar_id: uuid.UUID, dispositivo_id: uuid.UUID) -> Dispositivo:
    dispositivo = db.get(Dispositivo, dispositivo_id)
    if dispositivo is None or dispositivo.hogar_id != hogar_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dispositivo no encontrado")
    return dispositivo


def actualizar(db: Session, dispositivo: Dispositivo, datos: DispositivoActualizarIn) -> Dispositivo:
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        if valor is None and campo in ("nombre", "alto_riesgo"):
            continue
        setattr(dispositivo, campo, valor)
    db.commit()
    return dispositivo


def borrar(db: Session, dispositivo: Dispositivo) -> None:
    db.delete(dispositivo)  # sus lecturas y consumos se van en cascada
    db.commit()
