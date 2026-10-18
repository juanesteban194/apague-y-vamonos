import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Agente
from app.modules.dispositivos.schemas import DispositivoActualizarIn, DispositivoIn


def _exigir_agente_de_la_casa(db: Session, hogar_id: uuid.UUID, agente_id: uuid.UUID | None) -> None:
    if agente_id is None:
        return
    agente = db.get(Agente, agente_id)
    if agente is None or agente.hogar_id != hogar_id:
        raise HTTPException(422, "Ese agente no es de esta casa. Elige uno de la lista.")


def crear(db: Session, hogar_id: uuid.UUID, datos: DispositivoIn) -> Dispositivo:
    _exigir_agente_de_la_casa(db, hogar_id, datos.agente_id)
    dispositivo = Dispositivo(hogar_id=hogar_id, **datos.model_dump())
    db.add(dispositivo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ese enchufe ya está registrado en esta casa.") from None
    return dispositivo


def listar(db: Session, hogar_id: uuid.UUID) -> list[Dispositivo]:
    return list(db.scalars(select(Dispositivo).where(Dispositivo.hogar_id == hogar_id).order_by(Dispositivo.creado_en)))


def obtener(db: Session, hogar_id: uuid.UUID, dispositivo_id: uuid.UUID) -> Dispositivo:
    dispositivo = db.get(Dispositivo, dispositivo_id)
    if dispositivo is None or dispositivo.hogar_id != hogar_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No encontramos ese dispositivo.")
    return dispositivo


def actualizar(db: Session, dispositivo: Dispositivo, datos: DispositivoActualizarIn) -> Dispositivo:
    if "agente_id" in datos.model_fields_set:
        _exigir_agente_de_la_casa(db, dispositivo.hogar_id, datos.agente_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        if valor is None and campo in ("nombre", "alto_riesgo"):
            continue
        setattr(dispositivo, campo, valor)
    db.commit()
    return dispositivo


def borrar(db: Session, dispositivo: Dispositivo) -> None:
    db.delete(dispositivo)  # sus lecturas y consumos se van en cascada
    db.commit()
