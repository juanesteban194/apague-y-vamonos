import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.alertas import service
from app.integrations.expo_push.cliente import token_valido
from app.modules.alertas.schemas import AlertaOut, PreferenciasAlertas, TokenPushIn
from app.modules.auth.dependencias import usuario_con_consentimiento
from app.modules.hogares.service import exigir_miembro

router = APIRouter(prefix="/hogares/{hogar_id}", tags=["alertas"])


@router.get("/alertas", response_model=list[AlertaOut])
def listar(
    hogar_id: uuid.UUID,
    solo_no_leidas: bool = False,
    db: Session = Depends(get_db),
    usuario_id: uuid.UUID = Depends(usuario_con_consentimiento),
):
    exigir_miembro(db, usuario_id, hogar_id)
    return service.listar(db, hogar_id, solo_no_leidas)


@router.post("/alertas/leidas", status_code=status.HTTP_204_NO_CONTENT)
def marcar_todas(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id)
    service.marcar_todas_leidas(db, hogar_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/alertas/{alerta_id}/leida", status_code=status.HTTP_204_NO_CONTENT)
def marcar_leida(hogar_id: uuid.UUID, alerta_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id)
    if not service.marcar_leida(db, hogar_id, alerta_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aviso no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/preferencias-alertas", response_model=PreferenciasAlertas)
def leer_preferencias(hogar_id: uuid.UUID, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    exigir_miembro(db, usuario_id, hogar_id)
    return PreferenciasAlertas(sensibilidad=service.sensibilidad_de(db, hogar_id))


@router.put("/preferencias-alertas", response_model=PreferenciasAlertas)
def guardar_preferencias(
    hogar_id: uuid.UUID, datos: PreferenciasAlertas, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)
):
    exigir_miembro(db, usuario_id, hogar_id)
    return PreferenciasAlertas(sensibilidad=service.guardar_sensibilidad(db, hogar_id, datos.sensibilidad))


tokens = APIRouter(prefix="/usuarios/yo/tokens-push", tags=["notificaciones"])


@tokens.put("", status_code=status.HTTP_204_NO_CONTENT)
def registrar_token(datos: TokenPushIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    """El celular registra su token de Expo Push para recibir avisos aunque la app esté cerrada."""
    if not token_valido(datos.token):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Token de notificaciones inválido")
    service.guardar_token_push(db, usuario_id, datos.token, datos.plataforma)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@tokens.delete("", status_code=status.HTTP_204_NO_CONTENT)
def quitar_token(datos: TokenPushIn, db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_con_consentimiento)):
    """Al cerrar sesión: este celular deja de recibir los avisos de esta cuenta."""
    service.borrar_token_push(db, usuario_id, datos.token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
