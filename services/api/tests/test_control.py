import asyncio
import hashlib
import hmac
import json
import threading
import uuid

import httpx
import pytest

from app.core.config import get_settings
from app.integrations.tuya_cloud import cliente as tuya
from app.integrations.tuya_cloud.cliente import ClienteTuyaCloud, ErrorTuyaCloud
from app.modules.dispositivos import control
from app.realtime.agentes import GestorAgentes, ResultadoComando

from .conftest import registrar_y_entrar


class SocketFalso:
    """WebSocket de un agente: al recibir un comando responde lo que se le indique (None = no responde)."""

    def __init__(self, gestor, respuesta):
        self.gestor, self.respuesta, self.recibidos = gestor, respuesta, []

    async def send_json(self, mensaje):
        self.recibidos.append(mensaje)
        if self.respuesta is not None:
            ok, error = self.respuesta
            asyncio.get_running_loop().call_soon(self.gestor.resolver, mensaje["id"], ok, error)


@pytest.fixture(autouse=True)
def reiniciar(monkeypatch):
    control.limitador._marcas.clear()
    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    monkeypatch.setattr(control.cliente_tuya, "_token", None)
    monkeypatch.setattr(get_settings(), "tuya_access_id", None)
    monkeypatch.setattr(get_settings(), "tuya_access_secret", None)


# --- gestor de agentes ---------------------------------------------------------------------------------------------
def test_gestor_sin_agentes_devuelve_none():
    assert asyncio.run(GestorAgentes().enviar(uuid.uuid4(), "x", "apagar")) is None


def test_gestor_comando_exitoso_y_mensaje_enviado():
    async def caso():
        g, hogar = GestorAgentes(), uuid.uuid4()
        ws = SocketFalso(g, (True, None))
        g.conectar(hogar, uuid.uuid4(), ws)
        r = await g.enviar(hogar, "tuya-1", "apagar")
        assert r == ResultadoComando(True)
        assert ws.recibidos[0]["tuya_id"] == "tuya-1" and ws.recibidos[0]["accion"] == "apagar" and ws.recibidos[0]["tipo"] == "comando"
        assert g._pendientes == {}  # no deja nada pendiente

    asyncio.run(caso())


def test_gestor_agente_que_no_responde_da_tiempo_agotado():
    async def caso():
        g, hogar = GestorAgentes(), uuid.uuid4()
        g.conectar(hogar, uuid.uuid4(), SocketFalso(g, None))
        r = await g.enviar(hogar, "t", "encender", espera_s=0.05)
        assert r.ok is False and "a tiempo" in r.detalle

    asyncio.run(caso())


def test_gestor_con_varios_agentes_basta_que_uno_lo_logre():
    async def caso():
        g, hogar = GestorAgentes(), uuid.uuid4()
        g.conectar(hogar, uuid.uuid4(), SocketFalso(g, (False, "ese enchufe no es mío")))
        g.conectar(hogar, uuid.uuid4(), SocketFalso(g, (True, None)))
        assert (await g.enviar(hogar, "t", "apagar")).ok is True

    asyncio.run(caso())


def test_gestor_si_todos_fallan_devuelve_el_motivo():
    async def caso():
        g, hogar = GestorAgentes(), uuid.uuid4()
        g.conectar(hogar, uuid.uuid4(), SocketFalso(g, (False, "enchufe sin respuesta")))
        r = await g.enviar(hogar, "t", "apagar")
        assert (r.ok, r.detalle) == (False, "enchufe sin respuesta")

    asyncio.run(caso())


# --- endpoint --------------------------------------------------------------------------------------------------------
def fijar(monkeypatch, agente=None, nube=None):
    """agente: ResultadoComando | None. nube: None (sin configurar), 'ok' o un texto de error."""
    llamadas = {"agente": [], "nube": []}

    async def enviar(hogar_id, tuya_id, accion, espera_s=8.0, agente_id=None):
        llamadas["agente"].append((tuya_id, accion))
        return agente

    monkeypatch.setattr(control.gestor_agentes, "enviar", enviar)
    if nube is not None:
        monkeypatch.setattr(control.cliente_tuya, "configurado", lambda: True)

        async def enviar_nube(tuya_id, encender):
            llamadas["nube"].append((tuya_id, encender))
            if nube != "ok":
                raise ErrorTuyaCloud(nube)

        monkeypatch.setattr(control.cliente_tuya, "enviar_comando", enviar_nube)
    return llamadas


def test_apagar_por_el_agente(client, auth, enchufe, monkeypatch):
    llamadas = fijar(monkeypatch, agente=ResultadoComando(True))
    r = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth)
    assert r.status_code == 200 and r.json() == {"dispositivo_id": enchufe["id"], "encendido": False, "via": "agente"}
    assert llamadas["agente"] == [(enchufe["tuya_id"], "apagar")] and llamadas["nube"] == []


def test_encender_por_el_agente(client, auth, enchufe, monkeypatch):
    fijar(monkeypatch, agente=ResultadoComando(True))
    r = client.post(f"/dispositivos/{enchufe['id']}/encender", headers=auth)
    assert r.json()["encendido"] is True


def test_sin_agente_usa_la_nube_de_respaldo(client, auth, enchufe, monkeypatch):
    llamadas = fijar(monkeypatch, agente=None, nube="ok")
    r = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth)
    assert r.json()["via"] == "nube" and llamadas["nube"] == [(enchufe["tuya_id"], False)]


def test_agente_que_falla_tambien_cae_a_la_nube(client, auth, enchufe, monkeypatch):
    llamadas = fijar(monkeypatch, agente=ResultadoComando(False, "sin respuesta"), nube="ok")
    assert client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth).json()["via"] == "nube"
    assert len(llamadas["agente"]) == 1


def test_sin_agente_ni_nube_responde_503_claro(client, auth, enchufe, monkeypatch):
    fijar(monkeypatch, agente=None)
    r = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth)
    assert r.status_code == 503 and "no tiene un agente asignado" in r.json()["detail"]


def test_si_todo_falla_el_mensaje_dice_por_que(client, auth, enchufe, monkeypatch):
    fijar(monkeypatch, agente=ResultadoComando(False, "no respondió a tiempo"), nube="tope de llamadas")
    detalle = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth).json()["detail"]
    assert "no respondió a tiempo" in detalle and "tope de llamadas" in detalle


def test_limite_de_frecuencia_por_enchufe(client, auth, enchufe, monkeypatch):
    fijar(monkeypatch, agente=ResultadoComando(True))
    maximo = get_settings().comandos_max_por_minuto
    codigos = [client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth).status_code for _ in range(maximo + 2)]
    assert codigos == [200] * maximo + [429, 429]


def test_permisos_y_errores(client, hogar, enchufe, auth, monkeypatch):
    fijar(monkeypatch, agente=ResultadoComando(True))
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=otro).status_code == 403
    assert client.post(f"/dispositivos/{uuid.uuid4()}/apagar", headers=auth).status_code == 404
    assert client.post(f"/dispositivos/{enchufe['id']}/apagar").status_code == 401


def test_viaje_completo_con_un_agente_real_por_websocket(client, auth, agente_token, enchufe):
    visto, listo, fin = {}, threading.Event(), threading.Event()

    def agente():
        with client.websocket_connect("/ws/agente") as ws:
            ws.send_json({"token": agente_token})
            assert ws.receive_json() == {"tipo": "conectado"}
            listo.set()
            comando = ws.receive_json()
            visto.update(comando)
            ws.send_text(json.dumps({"tipo": "resultado", "id": comando["id"], "ok": True}))
            fin.wait(10)

    hilo = threading.Thread(target=agente, daemon=True)
    hilo.start()
    assert listo.wait(10)
    r = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth)
    fin.set()
    hilo.join(10)
    assert r.status_code == 200 and r.json()["via"] == "agente"
    assert visto["tuya_id"] == enchufe["tuya_id"] and visto["accion"] == "apagar"


# --- WebSocket del agente --------------------------------------------------------------------------------------------
def test_ws_agente_rechaza_token_invalido(client):
    from starlette.websockets import WebSocketDisconnect

    with client.websocket_connect("/ws/agente") as ws:
        ws.send_json({"token": "falso"})
        with pytest.raises(WebSocketDisconnect) as e:
            ws.receive_json()
        assert e.value.code == 4401


def test_ws_agente_un_token_de_usuario_no_sirve(client, auth):
    from starlette.websockets import WebSocketDisconnect

    with client.websocket_connect("/ws/agente") as ws:
        ws.send_json({"token": auth["Authorization"].removeprefix("Bearer ")})
        with pytest.raises(WebSocketDisconnect):
            ws.receive_json()


def test_ws_agente_conecta_responde_ping_y_marca_conexion(client, auth, hogar, agente_token):
    with client.websocket_connect("/ws/agente") as ws:
        ws.send_json({"token": agente_token})
        assert ws.receive_json() == {"tipo": "conectado"}
        ws.send_text("ping")
        assert ws.receive_json() == {"tipo": "pong"}
    assert client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json()[0]["ultima_conexion"] is not None


# --- Tuya Cloud --------------------------------------------------------------------------------------------------------
def test_firma_de_tuya_coincide_con_el_calculo_independiente():
    # string_a_firmar = METODO \n sha256(cuerpo) \n (cabeceras vacías) \n ruta ; firma = HMAC(id + token + t + nonce + string)
    cuerpo = b'{"commands":[{"code":"switch_1","value":false}]}'
    string = "POST\n" + hashlib.sha256(cuerpo).hexdigest() + "\n\n/v1.0/iot-03/devices/abc/commands"
    esperado = hmac.new(b"secreto", ("mi-id" + "TOKEN" + "1700000000000" + "nonce1" + string).encode(), hashlib.sha256).hexdigest().upper()
    assert tuya.firmar("mi-id", "secreto", "1700000000000", "POST", "/v1.0/iot-03/devices/abc/commands", cuerpo, "TOKEN", "nonce1") == esperado
    # el token inicial se firma sin access_token y sin cuerpo (sha256 de vacío)
    vacio = "GET\n" + hashlib.sha256(b"").hexdigest() + "\n\n/v1.0/token?grant_type=1"
    assert tuya.firmar("mi-id", "secreto", "1", "GET", "/v1.0/token?grant_type=1") == hmac.new(b"secreto", ("mi-id" + "1" + "" + vacio).encode(), hashlib.sha256).hexdigest().upper()


def tuya_listo(monkeypatch, manejador):
    s = get_settings()
    monkeypatch.setattr(s, "tuya_access_id", "id-prueba")
    monkeypatch.setattr(s, "tuya_access_secret", "secreto-prueba")
    return ClienteTuyaCloud(httpx.AsyncClient(transport=httpx.MockTransport(manejador)))


def test_tuya_pide_el_token_una_sola_vez_y_envia_el_comando(monkeypatch):
    vistas = []

    def manejador(request):
        vistas.append((request.method, request.url.path, request.headers.get("access_token")))
        if request.url.path == "/v1.0/token":
            return httpx.Response(200, json={"success": True, "result": {"access_token": "TK", "expire_time": 7200}})
        assert json.loads(request.content) == {"commands": [{"code": "switch_1", "value": False}]}
        assert request.headers["sign_method"] == "HMAC-SHA256" and request.headers["client_id"] == "id-prueba" and request.headers["sign"]
        return httpx.Response(200, json={"success": True, "result": True})

    c = tuya_listo(monkeypatch, manejador)

    async def caso():
        await c.enviar_comando("dev1", False)
        await c.enviar_comando("dev1", False)

    asyncio.run(caso())
    assert [v[1] for v in vistas] == ["/v1.0/token", "/v1.0/iot-03/devices/dev1/commands", "/v1.0/iot-03/devices/dev1/commands"]
    assert c.llamadas_del_mes() == 3  # 1 token + 2 comandos


def test_tuya_respeta_el_tope_mensual(monkeypatch):
    monkeypatch.setattr(get_settings(), "tuya_llamadas_max_mes", 2)
    c = tuya_listo(monkeypatch, lambda r: httpx.Response(200, json={"success": True, "result": {"access_token": "T", "expire_time": 7200}}))

    async def caso():
        await c.enviar_comando("d", True)  # token (1) + comando (2)
        with pytest.raises(ErrorTuyaCloud, match="tope"):
            await c.enviar_comando("d", True)

    asyncio.run(caso())
    assert c.llamadas_del_mes() == 2  # nunca pasa del tope


def test_tuya_errores_se_traducen(monkeypatch):
    c = tuya_listo(monkeypatch, lambda r: httpx.Response(200, json={"success": False, "msg": "permission deny", "code": 1106}))
    with pytest.raises(ErrorTuyaCloud, match="permission deny"):
        asyncio.run(c.enviar_comando("d", True))

    def sin_red(request):
        raise httpx.ConnectError("sin red")

    c2 = tuya_listo(monkeypatch, sin_red)
    with pytest.raises(ErrorTuyaCloud, match="sin conexión"):
        asyncio.run(c2.enviar_comando("d", True))


def test_tuya_sin_credenciales_no_hace_nada():
    with pytest.raises(ErrorTuyaCloud, match="no está configurado"):
        asyncio.run(ClienteTuyaCloud().enviar_comando("d", True))
