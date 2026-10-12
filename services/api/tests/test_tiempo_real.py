from datetime import UTC, datetime, timedelta

import pytest
from starlette.websockets import WebSocketDisconnect

from .conftest import registrar_y_entrar
from .test_ingesta import enviar, lectura


def ahora(segundos=0):
    return (datetime.now(UTC) + timedelta(seconds=segundos)).isoformat()


def abrir(client, hogar_id, auth):
    ws = client.websocket_connect(f"/ws/hogares/{hogar_id}")
    sesion = ws.__enter__()
    sesion.send_json({"token": auth["Authorization"].removeprefix("Bearer ")})
    return ws, sesion


def test_recibe_lectura_en_vivo(client, auth, hogar, agente_token, enchufe):
    ws, s = abrir(client, hogar["id"], auth)
    try:
        assert s.receive_json() == {"tipo": "conectado"}
        enviar(client, agente_token, [lectura(fecha_hora=ahora())])
        ev = s.receive_json()
        assert ev["tipo"] == "lectura" and ev["dispositivo_id"] == enchufe["id"]
        assert ev["potencia_w"] == 26.5 and ev["voltaje_v"] == 128.1 and ev["corriente_ma"] == 221
    finally:
        ws.__exit__(None, None, None)


def test_cambio_de_encendido_emite_estado_enchufe(client, auth, hogar, agente_token, enchufe):
    enviar(client, agente_token, [lectura(fecha_hora=ahora(-10), encendido=True)])
    ws, s = abrir(client, hogar["id"], auth)
    try:
        s.receive_json()
        enviar(client, agente_token, [lectura(fecha_hora=ahora(), encendido=False, potencia_w=0)])
        tipos = [s.receive_json()["tipo"], s.receive_json()["tipo"]]
        assert tipos == ["estado_enchufe", "lectura"]
        enviar(client, agente_token, [lectura(fecha_hora=ahora(5), encendido=False, potencia_w=0)])
        assert s.receive_json()["tipo"] == "lectura"  # sin cambio de estado: solo lectura
    finally:
        ws.__exit__(None, None, None)


def test_lecturas_viejas_no_se_publican_en_vivo(client, auth, hogar, agente_token, enchufe):
    ws, s = abrir(client, hogar["id"], auth)
    try:
        s.receive_json()
        enviar(client, agente_token, [lectura(fecha_hora=ahora(-3600))])  # reenvío tras una caída
        enviar(client, agente_token, [lectura(fecha_hora=ahora())])
        assert s.receive_json()["tipo"] == "lectura"  # lo primero que llega es la reciente
    finally:
        ws.__exit__(None, None, None)


def test_un_lote_publica_solo_la_ultima_por_dispositivo(client, auth, hogar, agente_token, enchufe):
    ws, s = abrir(client, hogar["id"], auth)
    try:
        s.receive_json()
        enviar(client, agente_token, [lectura(fecha_hora=ahora(-10)), lectura(fecha_hora=ahora(-5)), lectura(fecha_hora=ahora())])
        primero = s.receive_json()
        enviar(client, agente_token, [lectura(fecha_hora=ahora(5))])
        segundo = s.receive_json()
        assert primero["fecha_hora"] < segundo["fecha_hora"]  # el segundo mensaje es del segundo envío
    finally:
        ws.__exit__(None, None, None)


def test_token_invalido_cierra(client, hogar):
    with client.websocket_connect(f"/ws/hogares/{hogar['id']}") as s:
        s.send_json({"token": "basura"})
        with pytest.raises(WebSocketDisconnect) as e:
            s.receive_json()
        assert e.value.code == 4401


def test_sin_token_en_el_primer_mensaje_cierra(client, hogar):
    with client.websocket_connect(f"/ws/hogares/{hogar['id']}") as s:
        s.send_json({"hola": "mundo"})
        with pytest.raises(WebSocketDisconnect) as e:
            s.receive_json()
        assert e.value.code == 4401


def test_otro_usuario_no_entra_al_hogar(client, hogar):
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    with client.websocket_connect(f"/ws/hogares/{hogar['id']}") as s:
        s.send_json({"token": otro["Authorization"].removeprefix("Bearer ")})
        with pytest.raises(WebSocketDisconnect) as e:
            s.receive_json()
        assert e.value.code == 4403


def test_un_token_de_renovacion_no_sirve(client, auth, hogar):
    r = client.post("/auth/login", json={"email": "ana@example.com", "contrasena": "clave-segura-1"}).json()
    with client.websocket_connect(f"/ws/hogares/{hogar['id']}") as s:
        s.send_json({"token": r["refresh_token"]})
        with pytest.raises(WebSocketDisconnect) as e:
            s.receive_json()
        assert e.value.code == 4401


def test_ping_pong(client, auth, hogar):
    ws, s = abrir(client, hogar["id"], auth)
    try:
        s.receive_json()
        s.send_text("ping")
        assert s.receive_json() == {"tipo": "pong"}
    finally:
        ws.__exit__(None, None, None)


def test_el_otro_hogar_no_recibe_eventos(client, auth, hogar, agente_token, enchufe):
    h2 = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=auth).json()
    ws2, s2 = abrir(client, h2["id"], auth)  # mismo usuario, otro hogar
    ws1, s1 = abrir(client, hogar["id"], auth)
    try:
        s1.receive_json(); s2.receive_json()
        enviar(client, agente_token, [lectura(fecha_hora=ahora())])
        assert s1.receive_json()["tipo"] == "lectura"
        s2.send_text("ping")
        assert s2.receive_json() == {"tipo": "pong"}  # lo primero que llega a s2 es el pong, no la lectura
    finally:
        ws1.__exit__(None, None, None); ws2.__exit__(None, None, None)
