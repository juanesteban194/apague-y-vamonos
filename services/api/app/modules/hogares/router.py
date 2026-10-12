import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import usuario_actual_id
from app.modules.hogares import service
from app.modules.hogares.schemas import AgenteCreadoOut, AgenteIn, HogarIn, HogarOut

router = APIRouter(prefix="/hogares", tags=["hogares"])


def _salida(hogar, rol: str) -> HogarOut:
    return HogarOut(
        id=hogar.id,
        nombre=hogar.nombre,
        barrio=hogar.barrio,
        estrato=hogar.estrato,
        tipo_medidor=hogar.tipo_medidor,
        limite_subsistencia_kwh=float(hogar.limite_subsistencia_kwh),
        rol=rol,
    )


@router.post("", response_model=HogarOut, status_code=status.HTTP_201_CREATED)
def crear(datos: HogarIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_actual_id)):
    return _salida(*service.crear_hogar(db, usuario_id, datos))


@router.get("", response_model=list[HogarOut])
def listar(db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_actual_id)):
    return [_salida(h, rol) for h, rol in service.listar_hogares(db, usuario_id)]


@router.post("/{hogar_id}/agentes", response_model=AgenteCreadoOut, status_code=status.HTTP_201_CREATED)
def crear_agente(
    hogar_id: uuid.UUID,
    datos: AgenteIn,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_actual_id),
):
    service.exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    agente, token = service.crear_agente(db, hogar_id, datos)
    return AgenteCreadoOut(id=agente.id, nombre=agente.nombre, token=token)
