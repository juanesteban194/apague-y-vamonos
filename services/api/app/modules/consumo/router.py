import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencias import usuario_con_consentimiento
from app.modules.consumo import service
from app.modules.consumo.schemas import ConsumoOut, ResumenOut
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Hogar
from app.modules.hogares.service import exigir_miembro

router = APIRouter(tags=["consumo"])


@router.get("/hogares/{hogar_id}/resumen", response_model=ResumenOut)
def resumen(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id)
    return service.resumen_hogar(db, db.get(Hogar, hogar_id))


@router.get("/dispositivos/{dispositivo_id}/consumo", response_model=ConsumoOut)
def consumo(
    dispositivo_id: uuid.UUID,
    periodo: Literal["dia", "semana", "mes"] = Query(),
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    dispositivo = db.get(Dispositivo, dispositivo_id)
    if dispositivo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dispositivo no encontrado")
    exigir_miembro(db, usuario_id, dispositivo.hogar_id)
    return service.consumo_dispositivo(db, db.get(Hogar, dispositivo.hogar_id), dispositivo, periodo)
