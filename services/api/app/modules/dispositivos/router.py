import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencias import usuario_con_consentimiento
from app.modules.dispositivos import service
from app.modules.dispositivos.schemas import DispositivoActualizarIn, DispositivoIn, DispositivoOut
from app.modules.hogares.service import exigir_miembro

router = APIRouter(prefix="/hogares/{hogar_id}/dispositivos", tags=["dispositivos"])


@router.post("", response_model=DispositivoOut, status_code=status.HTTP_201_CREATED)
def crear(
    hogar_id: uuid.UUID,
    datos: DispositivoIn,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    return service.crear(db, hogar_id, datos)


@router.get("", response_model=list[DispositivoOut])
def listar(
    hogar_id: uuid.UUID,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    exigir_miembro(db, usuario_id, hogar_id)
    return service.listar(db, hogar_id)


@router.patch("/{dispositivo_id}", response_model=DispositivoOut)
def actualizar(
    hogar_id: uuid.UUID,
    dispositivo_id: uuid.UUID,
    datos: DispositivoActualizarIn,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    return service.actualizar(db, service.obtener(db, hogar_id, dispositivo_id), datos)


@router.delete("/{dispositivo_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar(
    hogar_id: uuid.UUID,
    dispositivo_id: uuid.UUID,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    service.borrar(db, service.obtener(db, hogar_id, dispositivo_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
