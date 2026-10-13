import uuid
from datetime import UTC, datetime

import httpx
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import get_sessionmaker
from app.integrations.expo_push import cliente as expo
from app.modules.alertas import notificar, service
from app.modules.alertas.models import TokenPush

from .conftest import registrar_y_entrar

TOKEN = "ExponentPushToken[abcDEF123]"
AHORA = datetime(2026, 10, 13, 15, 0, 0, tzinfo=UTC)


def registrar(client, auth, token=TOKEN, plataforma="android"):
    return client.put("/usuarios/yo/tokens-push", json={"token": token, "plataforma": plataforma}, headers=auth)


def tokens_guardados():
    with get_sessionmaker()() as db:
        return [(t.token_expo, t.plataforma) for t in db.scalars(select(TokenPush))]


# --- tokens ----------------------------------------------------------------------------------------------------------------
def test_registrar_y_quitar_el_token_del_celular(client, auth):
    assert registrar(client, auth).status_code == 204
    assert registrar(client, auth).status_code == 204  # repetir no duplica
    assert tokens_guardados() == [(TOKEN, "android")]
    assert client.request("DELETE", "/usuarios/yo/tokens-push", json={"token": TOKEN, "plataforma": "android"}, headers=auth).status_code == 204
    assert tokens_guardados() == []


def test_tokens_invalidos(client, auth):
    for malo in ("hola", "ExponentPushToken[sin-cierre", "fcm:abc"):
        assert registrar(client, auth, malo).status_code == 422
    assert registrar(client, auth, plataforma="windows").status_code == 422
    assert client.put("/usuarios/yo/tokens-push", json={"token": TOKEN, "plataforma": "ios"}).status_code == 401


def test_si_el_celular_cambia_de_cuenta_el_token_pasa_a_la_nueva(client, auth):
    registrar(client, auth)
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    registrar(client, otro, plataforma="ios")
    assert tokens_guardados() == [(TOKEN, "ios")]  # un solo registro, ahora de Beto
    # Ana ya no puede quitar el token que ahora es de Beto
    client.request("DELETE", "/usuarios/yo/tokens-push", json={"token": TOKEN, "plataforma": "ios"}, headers=auth)
    assert tokens_guardados() == [(TOKEN, "ios")]


# --- cliente de Expo -------------------------------------------------------------------------------------------------------
def cliente_falso(manejador):
    return httpx.Client(transport=httpx.MockTransport(manejador))


def test_envia_en_lotes_de_100_y_devuelve_los_tokens_muertos():
    lotes = []

    def manejador(request):
        import json
        lote = json.loads(request.content)
        lotes.append(len(lote))
        return httpx.Response(200, json={"data": [
            {"status": "error", "message": "no existe", "details": {"error": "DeviceNotRegistered"}} if m["to"].endswith("[7]") else {"status": "ok", "id": "x"}
            for m in lote
        ]})

    mensajes = [{"to": f"ExponentPushToken[{i}]", "title": "t", "body": "b"} for i in range(230)]
    muertos = expo.enviar(mensajes, cliente_falso(manejador))
    assert lotes == [100, 100, 30] and muertos == ["ExponentPushToken[7]"]


def test_un_fallo_de_red_o_de_expo_no_lanza():
    def sin_red(request):
        raise httpx.ConnectError("sin red")

    assert expo.enviar([{"to": TOKEN}], cliente_falso(sin_red)) == []
    assert expo.enviar([{"to": TOKEN}], cliente_falso(lambda r: httpx.Response(500))) == []
    assert expo.enviar([{"to": TOKEN}], cliente_falso(lambda r: httpx.Response(200, text="no es json"))) == []


def test_la_autorizacion_va_solo_si_hay_token_de_acceso(monkeypatch):
    vistas = []
    manejador = lambda r: (vistas.append(r.headers.get("authorization")), httpx.Response(200, json={"data": [{"status": "ok"}]}))[1]
    expo.enviar([{"to": TOKEN}], cliente_falso(manejador))
    monkeypatch.setattr(get_settings(), "expo_access_token", "SECRETO")
    expo.enviar([{"to": TOKEN}], cliente_falso(manejador))
    assert vistas == [None, "Bearer SECRETO"]


# --- el aviso llega como push -------------------------------------------------------------------------------------------------
def crear_aviso(hogar_id, dispositivo_id=None, tipo="alto_riesgo", nivel="rojo"):
    with get_sessionmaker()() as db:
        a = service.crear(db, uuid.UUID(hogar_id), tipo, nivel, "Ventilador lleva 40 minutos prendido", "Apáguelo.", uuid.UUID(dispositivo_id) if dispositivo_id else None, ahora=AHORA)
        notificar.notificar(db, [a])
        return a


def espiar(monkeypatch, muertos=None):
    enviados = []
    monkeypatch.setattr(notificar.expo_push, "enviar", lambda mensajes, cliente=None: (enviados.extend(mensajes), muertos or [])[1])
    return enviados


def test_el_push_sale_a_los_miembros_del_hogar_con_el_boton_apagar(client, auth, hogar, enchufe, monkeypatch):
    registrar(client, auth)
    ajeno = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")  # no es del hogar
    registrar(client, ajeno, token="ExponentPushToken[ajeno]")
    enviados = espiar(monkeypatch)
    a = crear_aviso(hogar["id"], enchufe["id"])
    assert [m["to"] for m in enviados] == [TOKEN]  # solo el de la casa
    m = enviados[0]
    assert (m["title"], m["body"], m["priority"], m["channelId"]) == ("Ventilador lleva 40 minutos prendido", "Apáguelo.", "high", "avisos")
    assert m["categoryId"] == "aviso_con_apagar"
    assert m["data"] == {"alerta_id": str(a.id), "tipo": "alto_riesgo", "nivel": "rojo", "dispositivo_id": enchufe["id"]}


def test_un_aviso_sin_aparato_o_amarillo_no_lleva_boton_apagar(client, auth, hogar, monkeypatch):
    registrar(client, auth)
    enviados = espiar(monkeypatch)
    crear_aviso(hogar["id"], None, "subsistencia", "amarillo")
    assert "categoryId" not in enviados[0] and enviados[0]["priority"] == "default" and "dispositivo_id" not in enviados[0]["data"]


def test_sin_celulares_registrados_no_se_llama_a_expo(client, auth, hogar, monkeypatch):
    enviados = espiar(monkeypatch)
    crear_aviso(hogar["id"])
    assert enviados == []


def test_los_tokens_muertos_se_borran(client, auth, hogar, monkeypatch):
    registrar(client, auth)
    espiar(monkeypatch, muertos=[TOKEN])
    crear_aviso(hogar["id"])
    assert tokens_guardados() == []


def test_si_el_push_falla_el_aviso_igual_queda(client, auth, hogar, monkeypatch):
    registrar(client, auth)

    def explota(*a, **k):
        raise RuntimeError("Expo caído")

    monkeypatch.setattr(notificar.expo_push, "enviar", explota)
    crear_aviso(hogar["id"])  # no lanza
    assert len(client.get(f"/hogares/{hogar['id']}/alertas", headers=auth).json()) == 1
