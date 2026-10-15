import uuid

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decodificar_token_con_version, token_bearer
from app.modules.auth.models import Usuario


def usuario_actual(db: Session = Depends(get_db), token: str = Depends(token_bearer)) -> Usuario:
    usuario_id, version = decodificar_token_con_version(token, "access")
    usuario = db.get(Usuario, usuario_id)
    # Al restablecer la contraseña la versión sube: las sesiones abiertas antes dejan de servir.
    if usuario is None or version != usuario.version_sesion:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o vencido")
    return usuario


def usuario_con_consentimiento(usuario: Usuario = Depends(usuario_actual)) -> uuid.UUID:
    """Id del usuario, solo si aceptó el tratamiento de datos (Ley 1581): sin eso no se sirve ni se guarda nada del hogar."""
    if usuario.consentimiento_datos_en is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "consentimiento_requerido")
    return usuario.id
