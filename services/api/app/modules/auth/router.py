from urllib.parse import urlencode

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.database import get_db
from app.integrations.correo import cliente as correo
from app.modules.auth import google, recuperacion, service
from app.modules.auth.dependencias import usuario_actual
from app.modules.auth.models import Usuario
from app.realtime.agentes import gestor_agentes
from app.modules.auth.schemas import (
    CanjeGoogleIn,
    CodigoIn,
    EliminarCuentaIn,
    OlvideContrasenaIn,
    RestablecerContrasenaIn,
    LoginIn,
    PerfilOut,
    RegistroIn,
    RenovarIn,
    TokensOut,
    UsuarioOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/registro", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def registro(datos: RegistroIn, segundo_plano: BackgroundTasks, db: Session = Depends(get_db)):
    usuario = service.registrar(db, datos)
    # Se manda el código para verificar el correo, pero sin hacer esperar a la persona ni fallar si el correo no sale.
    segundo_plano.add_task(correo.enviar, recuperacion.emitir_codigo(db, usuario, "verificar"))
    return usuario


@router.post("/olvide-contrasena", status_code=status.HTTP_202_ACCEPTED)
def olvide_contrasena(datos: OlvideContrasenaIn, peticion: Request, segundo_plano: BackgroundTasks, db: Session = Depends(get_db)):
    """Manda un código al correo si tiene cuenta. La respuesta es siempre la misma: no se revela quién tiene cuenta."""
    origen = peticion.client.host if peticion.client else "desconocido"
    mensaje = recuperacion.pedir_recuperacion(db, datos.email, origen)
    if mensaje is not None:
        segundo_plano.add_task(correo.enviar, mensaje)
    return {"detalle": "Si ese correo tiene una cuenta, te enviamos un código. Vale 15 minutos."}


@router.post("/restablecer-contrasena", status_code=status.HTTP_204_NO_CONTENT)
def restablecer_contrasena(datos: RestablecerContrasenaIn, db: Session = Depends(get_db)):
    """Con el código del correo se elige una contraseña nueva. Las sesiones abiertas se cierran."""
    recuperacion.restablecer_contrasena(db, datos.email, datos.codigo, datos.contrasena_nueva)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/verificar-correo/enviar", status_code=status.HTTP_202_ACCEPTED)
def enviar_verificacion(
    peticion: Request, segundo_plano: BackgroundTasks, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)
):
    if usuario.email_verificado_en is not None:
        return {"detalle": "Tu correo ya está verificado."}
    origen = peticion.client.host if peticion.client else "desconocido"
    if not recuperacion.permitir_pedido(usuario.email, origen):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Pediste varios códigos seguidos. Espera un rato e intenta de nuevo.")
    segundo_plano.add_task(correo.enviar, recuperacion.emitir_codigo(db, usuario, "verificar"))
    return {"detalle": "Te enviamos un código a tu correo. Vale 15 minutos."}


@router.post("/verificar-correo", response_model=PerfilOut)
def verificar_correo(datos: CodigoIn, usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    recuperacion.verificar_correo(db, usuario, datos.codigo)
    return service.perfil_de(usuario)


@router.post("/login", response_model=TokensOut)
def login(datos: LoginIn, db: Session = Depends(get_db)):
    return service.iniciar_sesion(db, datos.email, datos.contrasena)


@router.post("/renovar", response_model=TokensOut)
def renovar(datos: RenovarIn, db: Session = Depends(get_db)):
    return service.renovar(db, datos.refresh_token)


@router.get("/yo", response_model=PerfilOut)
def yo(usuario: Usuario = Depends(usuario_actual)):
    """Quién soy y si ya acepté el tratamiento de datos (la app decide qué pantalla mostrar con esto)."""
    return service.perfil_de(usuario)


@router.delete("/yo", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_cuenta(
    datos: EliminarCuentaIn | None = None,
    usuario: Usuario = Depends(usuario_actual),
    db: Session = Depends(get_db),
):
    """Borra la cuenta y sus datos (derecho de supresión, Ley 1581). No pide haber aceptado el tratamiento: quien no lo acepta debe poder irse."""
    borradas = await run_in_threadpool(service.eliminar_cuenta, db, usuario, datos.contrasena if datos else None)
    for hogar_id in borradas:
        await gestor_agentes.cerrar(hogar_id)  # los agentes de una casa borrada no deben seguir conectados
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/consentimiento", response_model=PerfilOut)
def consentimiento(usuario: Usuario = Depends(usuario_actual), db: Session = Depends(get_db)):
    return service.perfil_de(service.aceptar_consentimiento(db, usuario))


@router.get("/google/inicio", include_in_schema=True)
def google_inicio(
    redirect_uri: str,
    code_challenge: str = Query(min_length=43, max_length=128),
    state: str = Query(max_length=200),
):
    """Paso 1: la app abre esta URL en el navegador. Redirige a Google."""
    google.exigir_configuracion()
    if not google.redirect_valido(redirect_uri):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "redirect_uri no permitido")
    state_firmado, nonce = google.crear_state(redirect_uri, code_challenge, state)
    return RedirectResponse(google.url_autorizacion(state_firmado, nonce), status_code=status.HTTP_302_FOUND)


@router.get("/google/callback")
def google_callback(state: str, code: str | None = None, error: str | None = None, db: Session = Depends(get_db)):
    """Paso 2: Google vuelve aquí. Se verifica a la persona y se regresa a la app con un código de un solo uso."""
    google.exigir_configuracion()
    datos = google.leer_state(state)

    def volver(**parametros: str) -> RedirectResponse:
        destino = datos["redirect_uri"]
        separador = "&" if "?" in destino else "?"
        return RedirectResponse(
            destino + separador + urlencode({**parametros, "state": datos["state_app"]}), status_code=status.HTTP_302_FOUND
        )

    if error or not code:
        return volver(error=error or "cancelado")
    try:
        perfil = google.obtener_perfil(code, datos["nonce"])
    except google.ErrorGoogle:
        return volver(error="google_fallo")
    usuario = service.usuario_desde_google(db, perfil)
    return volver(code=google.emitir_codigo(usuario.id, datos["challenge"]))


@router.post("/google/canje", response_model=TokensOut)
def google_canje(datos: CanjeGoogleIn, db: Session = Depends(get_db)):
    """Paso 3: la app canjea el código con su code_verifier y recibe los tokens de la API."""
    return service.tokens_de(db, google.canjear_codigo(datos.code, datos.code_verifier))
