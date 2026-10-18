from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.hogares.models import Agente
from app.modules.ingesta import service
from app.modules.ingesta.schemas import LecturasIn, LecturasOut
from app.realtime.manager import gestor

router = APIRouter(prefix="/ingesta", tags=["ingesta"])


@router.post("/lecturas", response_model=LecturasOut)
def recibir_lecturas(
    datos: LecturasIn,
    en_segundo_plano: BackgroundTasks,
    agente: Agente = Depends(service.agente_actual),
    db: Session = Depends(get_db),
):
    salida, eventos_por_hogar = service.guardar_lecturas(db, agente, datos)
    for hogar_id, eventos in eventos_por_hogar.items():  # se publica después de responder al agente: no le suma latencia
        en_segundo_plano.add_task(gestor.publicar, hogar_id, eventos)
    return salida
