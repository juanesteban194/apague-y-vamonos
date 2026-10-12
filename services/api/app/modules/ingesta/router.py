from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.hogares.models import Agente
from app.modules.ingesta import service
from app.modules.ingesta.schemas import LecturasIn, LecturasOut

router = APIRouter(prefix="/ingesta", tags=["ingesta"])


@router.post("/lecturas", response_model=LecturasOut)
def recibir_lecturas(
    datos: LecturasIn,
    agente: Agente = Depends(service.agente_actual),
    db: Session = Depends(get_db),
):
    return service.guardar_lecturas(db, agente, datos)
