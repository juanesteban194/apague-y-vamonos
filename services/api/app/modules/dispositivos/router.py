import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import usuario_actual_id
from app.modules.dispositivos import service
from app.modules.dispositivos.schemas import DispositivoIn, DispositivoOut
from app.modules.hogares.service import exigir_miembro

router = APIRouter(prefix="/hogares/{hogar_id}/dispositivos", tags=["dispositivos"])


@router.post("", response_model=DispositivoOut, status_code=status.HTTP_201_CREATED)
def crear(
    hogar_id: uuid.UUID,
    datos: DispositivoIn,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_actual_id),
):
    exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    return service.crear(db, hogar_id, datos)


@router.get("", response_model=list[DispositivoOut])
def listar(
    hogar_id: uuid.UUID,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_actual_id),
):
    exigir_miembro(db, usuario_id, hogar_id)
    return service.listar(db, hogar_id)
