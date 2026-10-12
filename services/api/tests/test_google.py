"""Inicio de sesión con Google, con Google simulado: se prueba todo nuestro lado del flujo (state, nonce, PKCE, vinculación)."""
import base64
import hashlib
import uuid
from urllib.parse import parse_qs, urlparse

import pytest

from app.core.config import get_settings
from app.modules.auth import google

from .conftest import registrar_y_entrar

VERIFICADOR = "v" * 50
REDIRECT = "exp://192.168.1.5:8081/--/auth-google"


def reto(verificador=VERIFICADOR):
    return base64.urlsafe_b64encode(hashlib.sha256(verificador.encode()).digest()).rstrip(b"=").decode()


@pytest.fixture
def google_listo(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "google_client_id", "cliente-prueba.apps.googleusercontent.com")
    monkeypatch.setattr(s, "google_client_secret", "secreto-prueba")
    monkeypatch.setattr(s, "api_public_url", "https://api.test")
    monkeypatch.setattr(google, "_codigos_usados", {})


def simular_google(monkeypatch, sub="g-123", email="ana@gmail.com", nombre="Ana Pérez", verificado=True, nonce=None):
    monkeypatch.setattr(google, "_intercambiar_codigo", lambda codigo: "id-token-falso")
    monkeypatch.setattr(
        google,
        "_validar_id_token",
        lambda token: {"sub": sub, "email": email, "email_verified": verificado, "name": nombre, "nonce": nonce},
    )


def iniciar(client, redirect=REDIRECT, challenge=None, state="estado-app"):
    r = client.get(
        "/auth/google/inicio",
        params={"redirect_uri": redirect, "code_challenge": challenge or reto(), "state": state},
        follow_redirects=False,
    )
    return r


def volver_de_google(client, monkeypatch, q_google, **perfil):
    """Hace de Google: vuelve al callback con un código y el mismo state que recibió."""
    simular_google(monkeypatch, nonce=q_google["nonce"][0], **perfil)
    return client.get("/auth/google/callback", params={"code": "codigo-de-google", "state": q_google["state"][0]}, follow_redirects=False)


def flujo_completo(client, monkeypatch, **perfil):
    r = iniciar(client)
    q = parse_qs(urlparse(r.headers["location"]).query)
    vuelta = volver_de_google(client, monkeypatch, q, **perfil)
    destino = urlparse(vuelta.headers["location"])
    return destino, parse_qs(destino.query)


def test_sin_configurar_responde_503(client):
    assert iniciar(client).status_code == 503


def test_inicio_redirige_a_google_con_lo_necesario(client, google_listo):
    r = iniciar(client)
    assert r.status_code == 302
    url = urlparse(r.headers["location"])
    assert (url.netloc, url.path) == ("accounts.google.com", "/o/oauth2/v2/auth")
    q = {k: v[0] for k, v in parse_qs(url.query).items()}
    assert q["client_id"] == "cliente-prueba.apps.googleusercontent.com"
    assert q["redirect_uri"] == "https://api.test/auth/google/callback"
    assert q["scope"] == "openid email profile" and q["response_type"] == "code"
    assert q["state"] and q["nonce"]


@pytest.mark.parametrize("malo", ["https://malo.com/x", "javascript:alert(1)", "http://localhost/x", "apagueyvamonos://ok#frag", ""])
def test_redirect_no_permitido(client, google_listo, malo):
    assert iniciar(client, redirect=malo).status_code == 400


def test_redirects_permitidos(client, google_listo):
    assert iniciar(client, redirect="apagueyvamonos://auth-google").status_code == 302
    assert iniciar(client, redirect="exps://x.exp.direct/--/auth-google").status_code == 302


def test_flujo_completo_crea_cuenta_sin_consentimiento(client, google_listo, monkeypatch):
    destino, q = flujo_completo(client, monkeypatch)
    assert f"{destino.scheme}://{destino.netloc}{destino.path}" == REDIRECT
    assert q["state"] == ["estado-app"] and "code" in q and "error" not in q

    r = client.post("/auth/google/canje", json={"code": q["code"][0], "code_verifier": VERIFICADOR})
    assert r.status_code == 200
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    yo = client.get("/auth/yo", headers=h).json()
    assert (yo["email"], yo["nombre"], yo["tiene_google"], yo["tiene_contrasena"], yo["tiene_consentimiento"]) == (
        "ana@gmail.com", "Ana Pérez", True, False, False,
    )
    # Ley 1581: sin consentimiento no se sirven ni se guardan datos del hogar.
    assert client.get("/hogares", headers=h).status_code == 403
    assert client.get("/hogares", headers=h).json()["detail"] == "consentimiento_requerido"
    assert client.post("/hogares", json={"nombre": "X", "estrato": 3}, headers=h).status_code == 403

    assert client.post("/auth/consentimiento", headers=h).json()["tiene_consentimiento"] is True
    assert client.get("/hogares", headers=h).status_code == 200


def test_el_codigo_no_sirve_sin_el_verificador_correcto(client, google_listo, monkeypatch):
    _, q = flujo_completo(client, monkeypatch)
    malo = client.post("/auth/google/canje", json={"code": q["code"][0], "code_verifier": "otro" * 15})
    assert malo.status_code == 400
    # un intento fallido no quema el código; el dueño legítimo sí puede canjearlo
    assert client.post("/auth/google/canje", json={"code": q["code"][0], "code_verifier": VERIFICADOR}).status_code == 200


def test_el_codigo_es_de_un_solo_uso(client, google_listo, monkeypatch):
    _, q = flujo_completo(client, monkeypatch)
    cuerpo = {"code": q["code"][0], "code_verifier": VERIFICADOR}
    assert client.post("/auth/google/canje", json=cuerpo).status_code == 200
    assert client.post("/auth/google/canje", json=cuerpo).status_code == 400


def test_codigo_vencido(client, google_listo, monkeypatch):
    monkeypatch.setattr(google, "VIGENCIA_CODIGO", google.timedelta(seconds=-1))
    vencido = google.emitir_codigo(uuid.uuid4(), reto())
    assert client.post("/auth/google/canje", json={"code": vencido, "code_verifier": VERIFICADOR}).status_code == 400


def test_state_alterado(client, google_listo, monkeypatch):
    simular_google(monkeypatch)
    r = client.get("/auth/google/callback", params={"code": "x", "state": "basura"}, follow_redirects=False)
    assert r.status_code == 400


def test_un_token_de_acceso_no_sirve_como_state_ni_como_codigo(client, google_listo, auth):
    token = auth["Authorization"].removeprefix("Bearer ")
    assert client.get("/auth/google/callback", params={"code": "x", "state": token}, follow_redirects=False).status_code == 400
    assert client.post("/auth/google/canje", json={"code": token, "code_verifier": VERIFICADOR}).status_code == 400


def test_el_usuario_cancela_en_google(client, google_listo):
    q = parse_qs(urlparse(iniciar(client).headers["location"]).query)
    r = client.get("/auth/google/callback", params={"error": "access_denied", "state": q["state"][0]}, follow_redirects=False)
    destino = parse_qs(urlparse(r.headers["location"]).query)
    assert destino["error"] == ["access_denied"] and destino["state"] == ["estado-app"] and "code" not in destino


def test_google_con_correo_no_verificado_se_rechaza(client, google_listo, monkeypatch):
    _, q = flujo_completo(client, monkeypatch, verificado=False)
    assert q["error"] == ["google_fallo"] and "code" not in q


def test_nonce_distinto_se_rechaza(client, google_listo, monkeypatch):
    q_google = parse_qs(urlparse(iniciar(client).headers["location"]).query)
    simular_google(monkeypatch, nonce="otro-nonce")
    r = client.get("/auth/google/callback", params={"code": "x", "state": q_google["state"][0]}, follow_redirects=False)
    assert parse_qs(urlparse(r.headers["location"]).query)["error"] == ["google_fallo"]


def test_falla_el_canje_con_google(client, google_listo, monkeypatch):
    q = parse_qs(urlparse(iniciar(client).headers["location"]).query)

    def falla(codigo):
        raise google.ErrorGoogle("sin red")

    monkeypatch.setattr(google, "_intercambiar_codigo", falla)
    r = client.get("/auth/google/callback", params={"code": "x", "state": q["state"][0]}, follow_redirects=False)
    assert parse_qs(urlparse(r.headers["location"]).query)["error"] == ["google_fallo"]


def test_correo_con_cuenta_de_contrasena_se_vincula_sin_duplicar(client, google_listo, monkeypatch):
    registrar_y_entrar(client, email="ana@gmail.com", nombre="Ana")  # cuenta por correo, con consentimiento
    _, q = flujo_completo(client, monkeypatch, email="ana@gmail.com")
    tokens = client.post("/auth/google/canje", json={"code": q["code"][0], "code_verifier": VERIFICADOR}).json()
    yo = client.get("/auth/yo", headers={"Authorization": f"Bearer {tokens['access_token']}"}).json()
    assert yo["tiene_google"] and yo["tiene_contrasena"] and yo["tiene_consentimiento"]  # misma cuenta, ya aceptó antes
    from app.core.database import get_sessionmaker
    from app.modules.auth.models import Usuario

    with get_sessionmaker()() as db:
        assert db.query(Usuario).count() == 1


def test_segundo_inicio_con_google_reutiliza_la_cuenta(client, google_listo, monkeypatch):
    for _ in range(2):
        _, q = flujo_completo(client, monkeypatch)
        assert client.post("/auth/google/canje", json={"code": q["code"][0], "code_verifier": VERIFICADOR}).status_code == 200
    from app.core.database import get_sessionmaker
    from app.modules.auth.models import Usuario

    with get_sessionmaker()() as db:
        assert db.query(Usuario).count() == 1


def test_cuenta_solo_google_no_entra_con_contrasena(client, google_listo, monkeypatch):
    flujo_completo(client, monkeypatch)
    r = client.post("/auth/login", json={"email": "ana@gmail.com", "contrasena": "cualquiera-123"})
    assert r.status_code == 401 and r.json() == client.post("/auth/login", json={"email": "no@x.co", "contrasena": "cualquiera-123"}).json()


def test_no_se_puede_registrar_con_correo_de_una_cuenta_google(client, google_listo, monkeypatch):
    flujo_completo(client, monkeypatch)
    r = client.post("/auth/registro", json={"email": "ana@gmail.com", "contrasena": "clave-segura-1", "nombre": "X", "acepta_tratamiento_datos": True})
    assert r.status_code == 409


def test_perfil_y_consentimiento_por_correo(client, auth):
    yo = client.get("/auth/yo", headers=auth).json()
    assert yo["tiene_consentimiento"] and yo["tiene_contrasena"] and not yo["tiene_google"]
    assert client.get("/auth/yo").status_code == 401
