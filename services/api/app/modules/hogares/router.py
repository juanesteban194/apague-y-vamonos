import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.database import get_db
from app.modules.auth.dependencias import usuario_con_consentimiento
from app.modules.agentes import service as agentes_service
from app.modules.agentes.schemas import AgenteConCodigoOut
from app.modules.hogares import service
from app.modules.hogares.models import Agente, Hogar
from app.realtime.agentes import gestor_agentes
from app.modules.hogares.schemas import (
    AgenteCreadoOut,
    AgenteIn,
    AgenteOut,
    AgenteRenombrarIn,
    HogarActualizarIn,
    HogarIn,
    HogarOut,
    LecturaMedidorIn,
    LecturaMedidorOut,
)

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
def crear(datos: HogarIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    return _salida(*service.crear_hogar(db, usuario_id, datos))


@router.get("", response_model=list[HogarOut])
def listar(db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    return [_salida(h, rol) for h, rol in service.listar_hogares(db, usuario_id)]


@router.post("/{hogar_id}/agentes", response_model=AgenteCreadoOut, status_code=status.HTTP_201_CREATED)
def crear_agente(
    hogar_id: uuid.UUID,
    datos: AgenteIn,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    service.exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    agente, token = service.crear_agente(db, hogar_id, datos)
    return AgenteCreadoOut(id=agente.id, nombre=agente.nombre, token=token)


@router.post("/{hogar_id}/agentes/con-codigo", response_model=AgenteConCodigoOut, status_code=status.HTTP_201_CREATED)
def crear_agente_con_codigo(
    hogar_id: uuid.UUID,
    datos: AgenteIn,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    """Agente nuevo sin token: la persona escribe el código de 6 dígitos en el programa del agente y este se vincula solo."""
    service.exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    return agentes_service.crear_con_codigo(db, hogar_id, datos.nombre)


@router.post("/{hogar_id}/agentes/{agente_id}/codigo", response_model=AgenteConCodigoOut)
def codigo_nuevo(
    hogar_id: uuid.UUID,
    agente_id: uuid.UUID,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    """Código nuevo para vincular este agente en otro computador (o si el anterior venció). El programa vinculado antes deja de servir al usarlo."""
    service.exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    agente = db.get(Agente, agente_id)
    if agente is None or agente.hogar_id != hogar_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agente no encontrado")
    return agentes_service.generar_codigo(db, agente)


@router.patch("/{hogar_id}", response_model=HogarOut)
def actualizar(
    hogar_id: uuid.UUID,
    datos: HogarActualizarIn,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    miembro = service.exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    return _salida(service.actualizar_hogar(db, db.get(Hogar, hogar_id), datos), miembro.rol)


@router.get("/{hogar_id}/agentes", response_model=list[AgenteOut])
def agentes(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    service.exigir_miembro(db, usuario_id, hogar_id)
    return service.agentes_con_enchufes(db, hogar_id)


@router.patch("/{hogar_id}/agentes/{agente_id}", response_model=AgenteOut)
def renombrar_agente(
    hogar_id: uuid.UUID,
    agente_id: uuid.UUID,
    datos: AgenteRenombrarIn,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    service.exigir_miembro(db, usuario_id, hogar_id, rol="titular")
    service.renombrar_agente(db, hogar_id, agente_id, datos.nombre)
    return next(a for a in service.agentes_con_enchufes(db, hogar_id) if a.id == agente_id)


@router.delete("/{hogar_id}/agentes/{agente_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revocar_agente(
    hogar_id: uuid.UUID,
    agente_id: uuid.UUID,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    await run_in_threadpool(service.exigir_miembro, db, usuario_id, hogar_id, "titular")
    await run_in_threadpool(service.revocar_agente, db, hogar_id, agente_id)
    await gestor_agentes.cerrar(hogar_id, agente_id)  # si seguía conectado, se le corta el canal ya
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{hogar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def borrar_casa(
    hogar_id: uuid.UUID,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    """Solo el titular. Borra la casa con todo lo suyo y no se puede deshacer."""
    await run_in_threadpool(service.exigir_miembro, db, usuario_id, hogar_id, "titular")
    await run_in_threadpool(service.borrar_hogar, db, hogar_id)
    await gestor_agentes.cerrar(hogar_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{hogar_id}/lecturas-medidor/{lectura_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_lectura(
    hogar_id: uuid.UUID,
    lectura_id: uuid.UUID,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    """Para corregir un error de digitación: se borra la lectura mala y se anota la correcta."""
    service.exigir_miembro(db, usuario_id, hogar_id)
    service.borrar_lectura_medidor(db, hogar_id, lectura_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{hogar_id}/lecturas-medidor", response_model=LecturaMedidorOut, status_code=status.HTTP_201_CREATED)
def registrar_lectura(
    hogar_id: uuid.UUID, datos: LecturaMedidorIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)
):
    service.exigir_miembro(db, usuario_id, hogar_id)
    return service.registrar_lectura_medidor(db, hogar_id, datos)


@router.get("/{hogar_id}/lecturas-medidor", response_model=list[LecturaMedidorOut])
def lecturas_medidor(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    service.exigir_miembro(db, usuario_id, hogar_id)
    return service.listar_lecturas_medidor(db, hogar_id)
