"""Recuperar la contraseña y verificar el correo con códigos de 6 dígitos."""
import re
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import get_sessionmaker
from app.integrations.correo import cliente as correo
from app.integrations.correo.cliente import Mensaje, enviar as enviar_real  # la función real, antes de que el parche automático la reemplace
from app.modules.auth import recuperacion
from app.modules.auth.models import CodigoCorreo, Usuario

from .conftest import registrar_y_entrar

CLAVE = "clave-segura-1"
NUEVA = "otra-clave-nueva-9"


@pytest.fixture(autouse=True)
def correos(monkeypatch):
    """Captura los correos que saldrían y reinicia los límites."""
    enviados = []
    monkeypatch.setattr(correo, "enviar", lambda mensaje, cliente=None: enviados.append(mensaje) or True)
    recuperacion.limitador._marcas.clear()
    return enviados


def codigo_de(mensaje):
    return re.search(r"\b(\d{6})\b", mensaje.texto).group(1)


def pedir(client, email="ana@example.com"):
    return client.post("/auth/olvide-contrasena", json={"email": email})


def restablecer(client, codigo, nueva=NUEVA, email="ana@example.com"):
    return client.post("/auth/restablecer-contrasena", json={"email": email, "codigo": codigo, "contrasena_nueva": nueva})


def entrar(client, clave, email="ana@example.com"):
    return client.post("/auth/login", json={"email": email, "contrasena": clave})


def usuario(email="ana@example.com"):
    with get_sessionmaker()() as db:
        return db.scalar(select(Usuario).where(Usuario.email == email))


# --- recuperar la contraseña ---------------------------------------------------------------------------------------------
def test_se_recupera_la_contrasena_con_el_codigo_del_correo(client, auth, correos):
    correos.clear()
    assert pedir(client).status_code == 202
    (mensaje,) = correos
    assert mensaje.para == "ana@example.com" and "recuperar" in mensaje.asunto
    assert restablecer(client, codigo_de(mensaje)).status_code == 204
    assert entrar(client, NUEVA).status_code == 200
    assert entrar(client, CLAVE).status_code == 401  # la vieja ya no sirve


def test_el_codigo_no_viaja_en_la_respuesta_y_no_se_guarda_en_claro(client, auth, correos):
    correos.clear()
    r = pedir(client)
    codigo = codigo_de(correos[0])
    assert codigo not in r.text
    with get_sessionmaker()() as db:
        fila = db.scalar(select(CodigoCorreo).where(CodigoCorreo.proposito == "recuperar"))
        assert codigo not in fila.codigo_hash


def test_la_respuesta_es_la_misma_exista_o_no_el_correo(client, auth, correos):
    correos.clear()
    existe, no_existe = pedir(client), pedir(client, "nadie@example.com")
    assert existe.status_code == no_existe.status_code == 202 and existe.json() == no_existe.json()
    assert [m.para for m in correos] == ["ana@example.com"]  # al que no existe no se le manda nada


def test_el_codigo_sirve_una_sola_vez(client, auth, correos):
    correos.clear()
    pedir(client)
    codigo = codigo_de(correos[0])
    assert restablecer(client, codigo).status_code == 204
    assert restablecer(client, codigo, "una-tercera-clave-1").status_code == 400


def test_un_codigo_malo_o_de_otro_correo_se_rechaza_igual(client, auth, correos):
    correos.clear()
    pedir(client)
    codigo = codigo_de(correos[0])
    mal = "000000" if codigo != "000000" else "111111"
    r = restablecer(client, mal)
    assert r.status_code == 400 and r.json()["detail"] == recuperacion.MENSAJE_CODIGO_MALO
    otro = restablecer(client, codigo, email="nadie@example.com")  # correo que no existe: mismo mensaje
    assert otro.status_code == 400 and otro.json()["detail"] == recuperacion.MENSAJE_CODIGO_MALO


def test_tras_5_intentos_fallidos_el_codigo_se_bloquea_aunque_luego_lo_adivinen(client, auth, correos):
    correos.clear()
    pedir(client)
    codigo = codigo_de(correos[0])
    mal = "000000" if codigo != "000000" else "111111"
    for _ in range(recuperacion.INTENTOS_MAXIMOS):
        assert restablecer(client, mal).status_code == 400
    assert restablecer(client, codigo).status_code == 400  # ya bloqueado
    assert entrar(client, CLAVE).status_code == 200  # la contraseña no cambió


def test_un_codigo_vencido_no_sirve(client, auth, correos):
    correos.clear()
    pedir(client)
    with get_sessionmaker()() as db:
        db.scalar(select(CodigoCorreo).where(CodigoCorreo.proposito == "recuperar")).expira_en = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    assert restablecer(client, codigo_de(correos[0])).status_code == 400


def test_pedir_otro_codigo_invalida_el_anterior(client, auth, correos):
    correos.clear()
    pedir(client)
    pedir(client)
    primero, segundo = (codigo_de(m) for m in correos)
    if primero != segundo:
        assert restablecer(client, primero).status_code == 400
    assert restablecer(client, segundo).status_code == 204


def test_hay_limite_de_pedidos_por_correo(client, auth, correos):
    correos.clear()
    for _ in range(recuperacion.PEDIDOS_POR_CORREO_POR_HORA + 3):
        assert pedir(client).status_code == 202  # misma respuesta siempre: no se nota
    assert len(correos) == recuperacion.PEDIDOS_POR_CORREO_POR_HORA


def test_la_contrasena_nueva_debe_cumplir_el_minimo(client, auth, correos):
    correos.clear()
    pedir(client)
    assert restablecer(client, codigo_de(correos[0]), "corta").status_code == 422


@pytest.mark.parametrize("malo", ["12345", "1234567", "abcdef"])
def test_el_codigo_debe_ser_de_6_digitos(client, auth, malo):
    assert restablecer(client, malo).status_code == 422


def test_restablecer_cierra_las_sesiones_abiertas(client, auth, correos):
    """Un teléfono perdido con la sesión abierta deja de servir al cambiar la contraseña."""
    refresco = client.post("/auth/login", json={"email": "ana@example.com", "contrasena": CLAVE}).json()["refresh_token"]
    assert client.get("/auth/yo", headers=auth).status_code == 200
    correos.clear()
    pedir(client)
    assert restablecer(client, codigo_de(correos[0])).status_code == 204
    assert client.get("/auth/yo", headers=auth).status_code == 401  # el token de acceso viejo
    assert client.post("/auth/renovar", json={"refresh_token": refresco}).status_code == 401  # y el de renovación
    nuevos = entrar(client, NUEVA).json()
    assert client.get("/auth/yo", headers={"Authorization": f"Bearer {nuevos['access_token']}"}).status_code == 200
    assert client.post("/auth/renovar", json={"refresh_token": nuevos["refresh_token"]}).status_code == 200


def test_una_cuenta_de_google_puede_ponerse_contrasena_con_el_codigo(client, correos):
    with get_sessionmaker()() as db:
        db.add(Usuario(email="g@example.com", nombre="Gabriela", google_sub="sub-1"))
        db.commit()
    correos.clear()
    pedir(client, "g@example.com")
    assert restablecer(client, codigo_de(correos[0]), email="g@example.com").status_code == 204
    assert entrar(client, NUEVA, "g@example.com").status_code == 200


def test_si_el_correo_no_sale_la_respuesta_es_la_misma(client, auth, monkeypatch):
    monkeypatch.setattr(correo, "enviar", lambda mensaje, cliente=None: False)
    assert pedir(client).status_code == 202


# --- verificar el correo -----------------------------------------------------------------------------------------------------
def test_registrarse_manda_un_codigo_para_verificar_el_correo(client, correos):
    correos.clear()
    registrar_y_entrar(client)
    (mensaje,) = correos
    assert mensaje.para == "ana@example.com" and "verificar" in mensaje.asunto
    assert usuario().email_verificado_en is None


def test_se_verifica_el_correo_con_el_codigo(client, correos):
    correos.clear()
    auth = registrar_y_entrar(client)
    assert client.get("/auth/yo", headers=auth).json()["email_verificado"] is False
    r = client.post("/auth/verificar-correo", json={"codigo": codigo_de(correos[0])}, headers=auth)
    assert r.status_code == 200 and r.json()["email_verificado"] is True
    assert client.get("/auth/yo", headers=auth).json()["email_verificado"] is True


def test_un_codigo_malo_no_verifica(client, correos):
    correos.clear()
    auth = registrar_y_entrar(client)
    mal = "000000" if codigo_de(correos[0]) != "000000" else "111111"
    assert client.post("/auth/verificar-correo", json={"codigo": mal}, headers=auth).status_code == 400
    assert client.get("/auth/yo", headers=auth).json()["email_verificado"] is False


def test_se_puede_pedir_otro_codigo_de_verificacion(client, correos):
    auth = registrar_y_entrar(client)
    correos.clear()
    assert client.post("/auth/verificar-correo/enviar", headers=auth).status_code == 202
    assert len(correos) == 1 and "verificar" in correos[0].asunto


def test_no_se_vuelve_a_enviar_si_ya_esta_verificado(client, correos):
    auth = registrar_y_entrar(client)
    client.post("/auth/verificar-correo", json={"codigo": codigo_de(correos[0])}, headers=auth)
    correos.clear()
    r = client.post("/auth/verificar-correo/enviar", headers=auth)
    assert r.status_code == 202 and "ya está verificado" in r.json()["detalle"] and correos == []


def test_pedir_verificacion_tiene_limite(client, correos):
    auth = registrar_y_entrar(client)
    estados = [client.post("/auth/verificar-correo/enviar", headers=auth).status_code for _ in range(recuperacion.PEDIDOS_POR_CORREO_POR_HORA + 2)]
    assert estados.count(429) >= 1


def test_la_verificacion_pide_sesion(client):
    assert client.post("/auth/verificar-correo", json={"codigo": "123456"}).status_code in (401, 403)
    assert client.post("/auth/verificar-correo/enviar").status_code in (401, 403)


def test_registrarse_no_falla_si_el_correo_no_sale(client, monkeypatch):
    monkeypatch.setattr(correo, "enviar", lambda mensaje, cliente=None: False)
    assert client.post("/auth/registro", json={"email": "z@example.com", "contrasena": CLAVE, "nombre": "Z", "acepta_tratamiento_datos": True}).status_code == 201


def test_entrar_con_google_deja_el_correo_verificado(client):
    from app.modules.auth import service
    from app.modules.auth.google import PerfilGoogle

    with get_sessionmaker()() as db:
        u = service.usuario_desde_google(db, PerfilGoogle(sub="s9", email="g9@example.com", nombre="G"))
        assert u.email_verificado_en is not None


def test_vincular_google_a_una_cuenta_con_contrasena_verifica_el_correo(client, auth):
    from app.modules.auth import service
    from app.modules.auth.google import PerfilGoogle

    assert usuario().email_verificado_en is None
    with get_sessionmaker()() as db:
        service.usuario_desde_google(db, PerfilGoogle(sub="s1", email="ana@example.com", nombre="Ana"))
    assert usuario().email_verificado_en is not None


# --- el cliente de correo (Brevo) -------------------------------------------------------------------------------------------------
@pytest.fixture
def brevo(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "brevo_api_key", "clave-de-prueba")
    monkeypatch.setattr(s, "correo_remitente_email", "equipo@example.com")
    monkeypatch.setattr(s, "correo_consola", False)


def test_brevo_recibe_remitente_destinatario_y_texto(monkeypatch, brevo):
    visto = {}

    def manejador(request):
        visto["cabecera"] = request.headers["api-key"]
        visto["cuerpo"] = __import__("json").loads(request.content)
        return httpx.Response(201, json={"messageId": "x"})

    cliente = httpx.Client(transport=httpx.MockTransport(manejador))
    assert enviar_real(Mensaje("a@example.com", "Hola", "texto", "<p>html</p>"), cliente) is True
    assert visto["cabecera"] == "clave-de-prueba"
    assert visto["cuerpo"] == {"sender": {"name": "Apague y vámonos", "email": "equipo@example.com"}, "to": [{"email": "a@example.com"}], "subject": "Hola", "textContent": "texto", "htmlContent": "<p>html</p>"}


def test_sin_clave_no_envia_y_no_falla(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "brevo_api_key", None)
    monkeypatch.setattr(s, "correo_consola", False)
    assert correo.configurado() is False
    llamado = []
    cliente = httpx.Client(transport=httpx.MockTransport(lambda r: llamado.append(r) or httpx.Response(201)))
    assert enviar_real(Mensaje("a@example.com", "x", "y"), cliente) is False
    assert llamado == []


@pytest.mark.parametrize("respuesta", [httpx.Response(401, json={"message": "key"}), httpx.Response(500), httpx.ConnectError("sin red")])
def test_si_brevo_falla_devuelve_false_sin_lanzar(respuesta, brevo):
    def manejador(request):
        if isinstance(respuesta, Exception):
            raise respuesta
        return respuesta

    assert enviar_real(Mensaje("a@example.com", "x", "y"), httpx.Client(transport=httpx.MockTransport(manejador))) is False
