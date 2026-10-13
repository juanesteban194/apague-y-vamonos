import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencias import usuario_con_consentimiento
from app.modules.hogares.models import Hogar
from app.modules.hogares.service import exigir_miembro
from app.modules.retiq import service
from app.modules.retiq.schemas import SimuladorIn, SimuladorOut

router = APIRouter(prefix="/simulador", tags=["retiq"])


@router.post("/retiq", response_model=SimuladorOut)
def simular(datos: SimuladorIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, datos.hogar_id)
    return service.simular(db, db.get(Hogar, datos.hogar_id), datos, datetime.now(UTC))
