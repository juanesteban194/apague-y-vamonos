import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencias import usuario_con_consentimiento
from app.modules.hogares.service import exigir_miembro
from app.modules.rutinas import service
from app.modules.rutinas.schemas import RutinaIn, RutinaOut

router = APIRouter(prefix="/hogares/{hogar_id}/rutinas", tags=["rutinas"])


@router.get("", response_model=list[RutinaOut])
def listar(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id)
    return service.listar(db, hogar_id)


@router.post("", response_model=RutinaOut, status_code=status.HTTP_201_CREATED)
def crear(hogar_id: uuid.UUID, datos: RutinaIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    return service.crear(db, hogar_id, datos)


@router.put("/{rutina_id}", response_model=RutinaOut)
def actualizar(
    hogar_id: uuid.UUID, rutina_id: uuid.UUID, datos: RutinaIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)
):
    exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    return service.actualizar(db, hogar_id, rutina_id, datos)


@router.delete("/{rutina_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar(hogar_id: uuid.UUID, rutina_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    service.borrar(db, hogar_id, rutina_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
