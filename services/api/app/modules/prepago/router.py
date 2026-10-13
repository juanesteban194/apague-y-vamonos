import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencias import usuario_con_consentimiento
from app.modules.hogares.service import exigir_miembro
from app.modules.prepago import service
from app.modules.prepago.schemas import PrepagoOut, SaldoIn

router = APIRouter(prefix="/hogares/{hogar_id}/prepago", tags=["prepago"])


@router.get("", response_model=PrepagoOut)
def ver(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id)
    return service.estado(db, hogar_id)


@router.put("", response_model=PrepagoOut, status_code=status.HTTP_200_OK)
def registrar(hogar_id: uuid.UUID, datos: SaldoIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    """Registra el saldo que muestra el medidor ahora. Cada registro afina la proyección."""
    exigir_miembro(db, usuario_id, hogar_id)
    service.registrar_saldo(db, hogar_id, datos.saldo_cop)
    return service.estado(db, hogar_id)
