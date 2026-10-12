from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth import service
from app.modules.auth.schemas import LoginIn, RegistroIn, RenovarIn, TokensOut, UsuarioOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/registro", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def registro(datos: RegistroIn, db: Session = Depends(get_db)):
    return service.registrar(db, datos)


@router.post("/login", response_model=TokensOut)
def login(datos: LoginIn, db: Session = Depends(get_db)):
    return service.iniciar_sesion(db, datos.email, datos.contrasena)


@router.post("/renovar", response_model=TokensOut)
def renovar(datos: RenovarIn, db: Session = Depends(get_db)):
    return service.renovar(db, datos.refresh_token)
