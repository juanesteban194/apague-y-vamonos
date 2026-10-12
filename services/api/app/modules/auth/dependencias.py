import uuid

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import usuario_actual_id
from app.modules.auth.models import Usuario


def usuario_actual(db: Session = Depends(get_db), usuario_id: uuid.UUID = Depends(usuario_actual_id)) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o vencido")
    return usuario


def usuario_con_consentimiento(usuario: Usuario = Depends(usuario_actual)) -> uuid.UUID:
    """Id del usuario, solo si aceptó el tratamiento de datos (Ley 1581): sin eso no se sirve ni se guarda nada del hogar."""
    if usuario.consentimiento_datos_en is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "consentimiento_requerido")
    return usuario.id
