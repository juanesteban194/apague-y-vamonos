"""Cada enchufe lo lee un agente: solo ese agente manda sus lecturas y recibe sus órdenes."""
import asyncio

from sqlalchemy import select

from app.core.database import get_sessionmaker
from app.modules.dispositivos import control
from app.modules.dispositivos.models import Dispositivo
from app.modules.ingesta.models import Lectura
from app.realtime.agentes import ResultadoComando

from .conftest import registrar_y_entrar
from .test_control import SocketFalso, fijar  # noqa: F401  (fijar no se usa; SocketFalso sí)
from .test_ingesta import enviar, lectura


def nuevo_agente(client, auth, hogar, nombre):
    r = client.post(f"/hogares/{hogar['id']}/agentes", json={"nombre": nombre}, headers=auth)
    assert r.status_code == 201
    return r.json()


def asignar(client, auth, hogar, enchufe, agente_id):
    return client.patch(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}", json={"agente_id": agente_id}, headers=auth)


def agente_del_enchufe(enchufe_id):
    with get_sessionmaker()() as db:
        d = db.scalar(select(Dispositivo).where(Dispositivo.id == enchufe_id))
        return str(d.agente_id) if d.agente_id else None


# --- asignar, cambiar y quitar -------------------------------------------------------------------------------------
def test_un_enchufe_nuevo_no_tiene_agente(client, auth, hogar, enchufe):
    assert enchufe["agente_id"] is None


def test_se_puede_asignar_cambiar_y_quitar_el_agente(client, auth, hogar, enchufe):
    sala, patio = nuevo_agente(client, auth, hogar, "Sala"), nuevo_agente(client, auth, hogar, "Patio")
    assert asignar(client, auth, hogar, enchufe, sala["id"]).json()["agente_id"] == sala["id"]
    assert asignar(client, auth, hogar, enchufe, patio["id"]).json()["agente_id"] == patio["id"]
    assert asignar(client, auth, hogar, enchufe, None).json()["agente_id"] is None


def test_actualizar_otra_cosa_no_toca_el_agente(client, auth, hogar, enchufe):
    sala = nuevo_agente(client, auth, hogar, "Sala")
    asignar(client, auth, hogar, enchufe, sala["id"])
    r = client.patch(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}", json={"nombre": "Nevera"}, headers=auth)
    assert r.json()["nombre"] == "Nevera" and r.json()["agente_id"] == sala["id"]


def test_no_se_puede_asignar_un_agente_de_otra_casa(client, auth, hogar, enchufe):
    otro = registrar_y_entrar(client, "otro@example.com")
    otra_casa = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=otro).json()
    ajeno = nuevo_agente(client, otro, otra_casa, "Ajeno")
    r = asignar(client, auth, hogar, enchufe, ajeno["id"])
    assert r.status_code == 422 and "no es de esta casa" in r.json()["detail"]
    r = client.post(f"/hogares/{hogar['id']}/dispositivos", json={"tuya_id": "z1", "nombre": "Z", "agente_id": ajeno["id"]}, headers=auth)
    assert r.status_code == 422


def test_se_puede_crear_el_enchufe_ya_con_su_agente(client, auth, hogar):
    sala = nuevo_agente(client, auth, hogar, "Sala")
    r = client.post(f"/hogares/{hogar['id']}/dispositivos", json={"tuya_id": "z1", "nombre": "Z", "agente_id": sala["id"]}, headers=auth)
    assert r.status_code == 201 and r.json()["agente_id"] == sala["id"]


def test_eliminar_un_agente_deja_sus_enchufes_sin_agente(client, auth, hogar, enchufe):
    sala = nuevo_agente(client, auth, hogar, "Sala")
    asignar(client, auth, hogar, enchufe, sala["id"])
    assert client.delete(f"/hogares/{hogar['id']}/agentes/{sala['id']}", headers=auth).status_code == 204
    assert agente_del_enchufe(enchufe["id"]) is None
    assert client.get(f"/hogares/{hogar['id']}/dispositivos", headers=auth).json()[0]["agente_id"] is None


# --- lista y nombre de agentes ----------------------------------------------------------------------------------------
def test_la_lista_de_agentes_trae_sus_enchufes_y_si_estan_conectados(client, auth, hogar, enchufe, monkeypatch):
    sala, patio = nuevo_agente(client, auth, hogar, "Sala"), nuevo_agente(client, auth, hogar, "Patio")
    asignar(client, auth, hogar, enchufe, sala["id"])
    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    import uuid

    control.gestor_agentes.conectar(uuid.UUID(hogar["id"]), uuid.UUID(sala["id"]), object())
    lista = {a["nombre"]: a for a in client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json()}
    assert lista["Sala"]["conectado"] is True and [e["nombre"] for e in lista["Sala"]["enchufes"]] == ["Ventilador"]
    assert lista["Patio"]["conectado"] is False and lista["Patio"]["enchufes"] == []


def test_renombrar_un_agente(client, auth, hogar):
    sala = nuevo_agente(client, auth, hogar, "Sala")
    r = client.patch(f"/hogares/{hogar['id']}/agentes/{sala['id']}", json={"nombre": "Sala principal"}, headers=auth)
    assert r.status_code == 200 and r.json()["nombre"] == "Sala principal"
    assert client.patch(f"/hogares/{hogar['id']}/agentes/{sala['id']}", json={"nombre": ""}, headers=auth).status_code == 422


def test_renombrar_un_agente_de_otra_casa_da_404(client, auth, hogar):
    otro = registrar_y_entrar(client, "otro@example.com")
    otra_casa = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=otro).json()
    ajeno = nuevo_agente(client, otro, otra_casa, "Ajeno")
    r = client.patch(f"/hogares/{hogar['id']}/agentes/{ajeno['id']}", json={"nombre": "mío"}, headers=auth)
    assert r.status_code in (403, 404)


# --- lecturas: solo las de sus enchufes -------------------------------------------------------------------------------
def contar():
    with get_sessionmaker()() as db:
        return len(list(db.scalars(select(Lectura))))


def test_el_primer_agente_que_lee_un_enchufe_sin_agente_se_queda_con_el(client, auth, hogar, enchufe, agente_token):
    assert agente_del_enchufe(enchufe["id"]) is None
    assert enviar(client, agente_token, [lectura(0)]).json()["guardadas"] == 1
    agente = client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json()[0]
    assert agente_del_enchufe(enchufe["id"]) == agente["id"]


def test_un_agente_no_puede_mandar_lecturas_de_un_enchufe_de_otro_agente(client, auth, hogar, enchufe):
    sala, patio = nuevo_agente(client, auth, hogar, "Sala"), nuevo_agente(client, auth, hogar, "Patio")
    asignar(client, auth, hogar, enchufe, sala["id"])
    r = enviar(client, patio["token"], [lectura(i) for i in range(3)])
    assert r.status_code == 200 and r.json() == {"recibidas": 3, "guardadas": 0, "duplicadas": 0, "desconocidas": 0, "de_otro_agente": 3}
    assert contar() == 0
    assert agente_del_enchufe(enchufe["id"]) == sala["id"]  # no se lo quitó
    assert enviar(client, sala["token"], [lectura(0)]).json()["guardadas"] == 1


def test_cada_agente_manda_lo_suyo_aunque_viajen_en_el_mismo_lote(client, auth, hogar, enchufe):
    sala = nuevo_agente(client, auth, hogar, "Sala")
    patio = nuevo_agente(client, auth, hogar, "Patio")
    otro = client.post(f"/hogares/{hogar['id']}/dispositivos", json={"tuya_id": "z1", "nombre": "Lámpara", "agente_id": patio["id"]}, headers=auth).json()
    asignar(client, auth, hogar, enchufe, sala["id"])
    r = enviar(client, sala["token"], [lectura(0), lectura(0, tuya_id="z1")]).json()
    assert (r["guardadas"], r["de_otro_agente"]) == (1, 1)
    assert otro["agente_id"] == patio["id"]


# --- órdenes: solo al agente de ese enchufe ---------------------------------------------------------------------------
def conectar(hogar, agente, respuesta=(True, None)):
    import uuid

    ws = SocketFalso(control.gestor_agentes, respuesta)
    control.gestor_agentes.conectar(uuid.UUID(hogar["id"]), uuid.UUID(agente["id"]), ws)
    return ws


def test_la_orden_va_solo_al_agente_asignado(client, auth, hogar, enchufe, monkeypatch):
    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    control.limitador._marcas.clear()
    sala, patio = nuevo_agente(client, auth, hogar, "Sala"), nuevo_agente(client, auth, hogar, "Patio")
    asignar(client, auth, hogar, enchufe, sala["id"])
    ws_sala, ws_patio = conectar(hogar, sala), conectar(hogar, patio)
    r = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth)
    assert r.status_code == 200 and r.json()["via"] == "agente"
    assert len(ws_sala.recibidos) == 1 and ws_patio.recibidos == []


def test_si_el_agente_asignado_no_esta_conectado_lo_dice_con_su_nombre(client, auth, hogar, enchufe, monkeypatch):
    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    control.limitador._marcas.clear()
    sala = nuevo_agente(client, auth, hogar, "Sala")
    asignar(client, auth, hogar, enchufe, sala["id"])
    detalle = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth).json()["detail"]
    assert "agente «Sala», que lee este enchufe, no está conectado" in detalle


def test_otro_agente_conectado_no_puede_controlarlo_y_el_mensaje_lo_explica(client, auth, hogar, enchufe, monkeypatch):
    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    control.limitador._marcas.clear()
    sala, patio = nuevo_agente(client, auth, hogar, "Sala"), nuevo_agente(client, auth, hogar, "Patio")
    asignar(client, auth, hogar, enchufe, sala["id"])
    ws_patio = conectar(hogar, patio)  # solo el del patio está conectado
    r = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth)
    assert r.status_code == 503
    assert "«Sala»" in r.json()["detail"] and "Los otros agentes conectados no leen este enchufe" in r.json()["detail"]
    assert ws_patio.recibidos == []  # la orden nunca le llegó al agente equivocado


def test_sin_agente_asignado_la_orden_se_le_pregunta_a_los_conectados(client, auth, hogar, enchufe, monkeypatch):
    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    control.limitador._marcas.clear()
    sala = nuevo_agente(client, auth, hogar, "Sala")
    ws = conectar(hogar, sala)
    assert client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth).json()["via"] == "agente"
    assert len(ws.recibidos) == 1


def test_si_el_agente_asignado_responde_que_no_pudo_lo_dice(client, auth, hogar, enchufe, monkeypatch):
    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    control.limitador._marcas.clear()
    sala = nuevo_agente(client, auth, hogar, "Sala")
    asignar(client, auth, hogar, enchufe, sala["id"])
    conectar(hogar, sala, respuesta=(False, "enchufe sin respuesta"))
    detalle = client.post(f"/dispositivos/{enchufe['id']}/apagar", headers=auth).json()["detail"]
    assert "«Sala» no pudo hacerlo (enchufe sin respuesta)" in detalle
