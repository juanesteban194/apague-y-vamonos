import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencias import usuario_con_consentimiento
from datetime import UTC, datetime

from app.modules.consumo import consejos, historial, service
from app.modules.consumo.schemas import ConsejoOut, ConsumoOut, ResumenOut
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


@router.get("/hogares/{hogar_id}/historial-consumo", response_model=historial.HistorialOut)
def ver_historial(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id)
    return historial.salida(historial.leer(db, hogar_id))


@router.put("/hogares/{hogar_id}/historial-consumo", response_model=historial.HistorialOut)
def guardar_historial(
    hogar_id: uuid.UUID, datos: historial.HistorialIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)
):
    """Reemplaza el histórico con los meses de la factura (kWh y, si quiere, lo pagado). Con ≥ 3 meses se calcula el promedio."""
    exigir_miembro(db, usuario_id, hogar_id)
    return historial.reemplazar(db, hogar_id, datos)


@router.get("/hogares/{hogar_id}/consejos", response_model=list[ConsejoOut])
def ver_consejos(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id)
    return [ConsejoOut(**vars(c)) for c in consejos.generar(db, db.get(Hogar, hogar_id), datetime.now(UTC))]
