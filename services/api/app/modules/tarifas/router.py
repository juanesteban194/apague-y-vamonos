import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import usuario_actual_id
from app.modules.hogares.models import Hogar
from app.modules.hogares.service import exigir_miembro
from app.modules.tarifas import service
from app.modules.tarifas.schemas import TarifaOut

router = APIRouter(prefix="/hogares/{hogar_id}/tarifa", tags=["tarifas"])
BOGOTA = ZoneInfo("America/Bogota")


@router.get("", response_model=TarifaOut)
def tarifa_del_hogar(
    hogar_id: uuid.UUID,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_actual_id),
):
    exigir_miembro(db, usuario_id, hogar_id)
    hogar = db.get(Hogar, hogar_id)
    hoy = datetime.now(BOGOTA).date()
    tarifa = service.tarifa_vigente(db, hogar.estrato, hoy)
    if tarifa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No hay tarifa cargada para el estrato {hogar.estrato}")
    return TarifaOut(
        estrato=tarifa.estrato,
        mes=tarifa.mes,
        cop_kwh_subsistencia=float(tarifa.cop_kwh_subsistencia),
        cop_kwh_sobre_subsistencia=float(tarifa.cop_kwh_sobre_subsistencia),
        fuente=tarifa.fuente,
        es_del_mes_actual=tarifa.mes == hoy.replace(day=1),
    )
