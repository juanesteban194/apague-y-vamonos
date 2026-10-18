"""Inicio de sesión con Google por el flujo de código de autorización, manejado por el backend.

La app abre el navegador en /auth/google/inicio; Google devuelve el control a /auth/google/callback; el backend verifica a la persona,
y vuelve a la app con un código de un solo uso (60 s) que ella canjea con su `code_verifier` (PKCE). Así funciona igual en Expo Go y en una
compilación propia, sin módulos nativos ni huellas SHA-1, y quien intercepte el enlace de vuelta no puede usar el código sin el verificador."""
import base64
import hashlib
import secrets
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode, urlparse

import httpx
import jwt
from fastapi import HTTPException, status

from app.core.config import get_settings

URL_AUTORIZACION = "https://accounts.google.com/o/oauth2/v2/auth"
URL_TOKEN = "https://oauth2.googleapis.com/token"
URL_CLAVES = "https://www.googleapis.com/oauth2/v3/certs"
EMISORES = ("https://accounts.google.com", "accounts.google.com")
# apagueyvamonos:// = app instalada; exp:// y exps:// = Expo Go en desarrollo.
ESQUEMAS_APP = {"apagueyvamonos", "exp", "exps"}
VIGENCIA_STATE = timedelta(minutes=10)
VIGENCIA_CODIGO = timedelta(seconds=60)

_claves_google = jwt.PyJWKClient(URL_CLAVES, cache_keys=True)
_codigos_usados: dict[str, float] = {}  # jti → vencimiento; basta con un proceso (Render gratuito)
_cerrojo = threading.Lock()


class ErrorGoogle(Exception):
    """Google rechazó el código o devolvió una identidad que no se puede aceptar."""


@dataclass(frozen=True)
class PerfilGoogle:
    sub: str
    email: str
    nombre: str


def exigir_configuracion() -> None:
    s = get_settings()
    if not s.google_client_id or not s.google_client_secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Entrar con Google no está disponible por ahora. Entra con tu correo y contraseña.")


def redirect_valido(uri: str) -> bool:
    p = urlparse(uri)
    return p.scheme in ESQUEMAS_APP and not p.fragment


def url_callback() -> str:
    return f"{get_settings().url_publica}/auth/google/callback"


def _firmar(claims: dict, vigencia: timedelta) -> str:
    ahora = datetime.now(UTC)
    return jwt.encode({**claims, "iat": ahora, "exp": ahora + vigencia}, get_settings().jwt_secret, algorithm="HS256")


def _leer(token: str, tipo: str) -> dict:
    try:
        claims = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El inicio de sesión con Google venció o no es válido. Intenta de nuevo.") from None
    if claims.get("type") != tipo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El inicio de sesión con Google venció o no es válido. Intenta de nuevo.")
    return claims


def crear_state(redirect_uri: str, code_challenge: str, state_app: str) -> tuple[str, str]:
    """State firmado (lleva a dónde volver y el reto PKCE de la app) y nonce que Google debe devolver en el id_token."""
    nonce = secrets.token_urlsafe(16)
    state = _firmar(
        {"type": "google_state", "redirect_uri": redirect_uri, "challenge": code_challenge, "state_app": state_app, "nonce": nonce},
        VIGENCIA_STATE,
    )
    return state, nonce


def leer_state(state: str) -> dict:
    return _leer(state, "google_state")


def url_autorizacion(state: str, nonce: str) -> str:
    return URL_AUTORIZACION + "?" + urlencode(
        {
            "client_id": get_settings().google_client_id,
            "redirect_uri": url_callback(),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "nonce": nonce,
            "prompt": "select_account",
        }
    )


def _intercambiar_codigo(codigo: str) -> str:
    """Canjea el código con Google, de servidor a servidor por TLS, y devuelve el id_token."""
    s = get_settings()
    try:
        r = httpx.post(
            URL_TOKEN,
            data={
                "code": codigo,
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
                "redirect_uri": url_callback(),
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
        r.raise_for_status()
        return r.json()["id_token"]
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise ErrorGoogle(f"no se pudo canjear el código: {type(e).__name__}") from None


def _validar_id_token(id_token: str) -> dict:
    try:
        clave = _claves_google.get_signing_key_from_jwt(id_token)
        return jwt.decode(
            id_token, clave.key, algorithms=["RS256"], audience=get_settings().google_client_id, issuer=list(EMISORES)
        )
    except (jwt.PyJWTError, httpx.HTTPError, OSError) as e:
        raise ErrorGoogle(f"id_token inválido: {type(e).__name__}") from None


def obtener_perfil(codigo: str, nonce: str) -> PerfilGoogle:
    claims = _validar_id_token(_intercambiar_codigo(codigo))
    if claims.get("nonce") != nonce:
        raise ErrorGoogle("nonce no coincide")
    if claims.get("email_verified") is not True or not claims.get("email"):
        raise ErrorGoogle("el correo de Google no está verificado")
    email = claims["email"].lower()
    return PerfilGoogle(sub=claims["sub"], email=email, nombre=claims.get("name") or email.split("@")[0])


def _reto(verificador: str) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(verificador.encode()).digest()).rstrip(b"=").decode()


def emitir_codigo(usuario_id: uuid.UUID, code_challenge: str) -> str:
    return _firmar(
        {"type": "canje_google", "sub": str(usuario_id), "challenge": code_challenge, "jti": uuid.uuid4().hex}, VIGENCIA_CODIGO
    )


def canjear_codigo(codigo: str, code_verifier: str) -> uuid.UUID:
    """Valida el código (vigente, de un solo uso y con el verificador que corresponde al reto) y devuelve el usuario."""
    claims = _leer(codigo, "canje_google")
    if not secrets.compare_digest(_reto(code_verifier), claims["challenge"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El inicio de sesión con Google venció o no es válido. Intenta de nuevo.")
    ahora = time.time()
    with _cerrojo:
        for jti in [j for j, vence in _codigos_usados.items() if vence < ahora]:
            del _codigos_usados[jti]
        if claims["jti"] in _codigos_usados:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "El inicio de sesión con Google venció o no es válido. Intenta de nuevo.")
        _codigos_usados[claims["jti"]] = claims["exp"]
    return uuid.UUID(claims["sub"])
