"""Endpoints que usa el programa del agente (no la app): vincularse con un código y pedir su configuración."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core import cifrado
from app.core.database import get_db
from app.modules.agentes import service
from app.modules.agentes.schemas import ClavesGuardadasOut, ClavesIn, ConfiguracionOut, VincularIn, VinculadoOut
from app.modules.hogares.models import Agente
from app.modules.ingesta.service import agente_actual

router = APIRouter(prefix="/agentes", tags=["agentes"])


@router.post("/vincular", response_model=VinculadoOut)
def vincular(datos: VincularIn, peticion: Request, db: Session = Depends(get_db)):
    """Sin sesión: el código de 6 dígitos que muestra la app es la autorización (vence en 10 minutos y sirve una vez)."""
    origen = peticion.client.host if peticion.client else "desconocido"
    return service.vincular(db, datos.codigo, origen)


@router.get("/configuracion", response_model=ConfiguracionOut)
async def configuracion(agente: Agente = Depends(agente_actual), db: Session = Depends(get_db)):
    """Con el token del agente: los enchufes que le tocan y sus claves locales (solo a él, por HTTPS)."""
    if not cifrado.disponible():
        # Sin clave maestra no hay claves guardadas: el agente responde igual, con todos sus enchufes en `sin_clave`.
        resultado = await run_in_threadpool(service.sin_claves, db, agente)
    else:
        resultado = await run_in_threadpool(service.configuracion, db, agente)
        resultado = await service.completar_claves(db, agente, resultado)
    await run_in_threadpool(db.commit)  # agente_actual anotó la última conexión
    return resultado


@router.post("/claves", response_model=ClavesGuardadasOut)
def subir_claves(datos: ClavesIn, agente: Agente = Depends(agente_actual), db: Session = Depends(get_db)):
    """El agente sube las claves locales que ya tiene (de su devices.json) cuando la API no pudo pedírselas a Tuya. Solo de SUS enchufes."""
    return service.guardar_claves(db, agente, datos.claves)
