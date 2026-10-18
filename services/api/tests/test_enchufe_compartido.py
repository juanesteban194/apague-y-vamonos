"""Un mismo ID de Tuya en varias cuentas (pruebas con un solo enchufe físico) y el modo COMPARTIR_ENCHUFES."""
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.database import get_sessionmaker
from app.modules.dispositivos import control
from app.modules.ingesta.models import Lectura
from app.realtime.manager import gestor

from .conftest import registrar_y_entrar
from .test_control import SocketFalso
from .test_ingesta import enviar

TUYA = "eb182b7a119cf6aaeecf66"


def ahora(segundos=0):
    return (datetime.now(UTC) - timedelta(seconds=segundos)).isoformat()


def lect(segundos=0, encendido=True, tuya_id=TUYA):
    return {"tuya_id": tuya_id, "fecha_hora": ahora(segundos), "potencia_w": 40.0, "voltaje_v": 120.0, "corriente_ma": 333, "encendido": encendido}


def cuenta(client, email):
    """Una cuenta con su casa, su enchufe (el mismo ID de Tuya) y su agente. Devuelve (cabecera, casa, enchufe, token del agente)."""
    auth = registrar_y_entrar(client, email)
    casa = client.post("/hogares", json={"nombre": f"Casa de {email}", "estrato": 3}, headers=auth).json()
    r = client.post(f"/hogares/{casa['id']}/dispositivos", json={"tuya_id": TUYA, "nombre": "Ventilador"}, headers=auth)
    assert r.status_code == 201, r.text
    agente = client.post(f"/hogares/{casa['id']}/agentes", json={"nombre": "Mac"}, headers=auth).json()
    return auth, casa, r.json(), agente["token"]


def lecturas_de(enchufe_id):
    with get_sessionmaker()() as db:
        return db.scalar(select(func.count()).select_from(Lectura).where(Lectura.dispositivo_id == uuid.UUID(enchufe_id)))


@pytest.fixture
def compartir(monkeypatch):
    monkeypatch.setattr(get_settings(), "compartir_enchufes", True)


@pytest.fixture
def publicado(monkeypatch):
    """Los eventos en vivo que se publicarían, por casa."""
    visto = {}
    monkeypatch.setattr(gestor, "publicar", lambda hogar_id, eventos: visto.setdefault(str(hogar_id), []).extend(eventos))
    return visto


# --- registrar el mismo ID en varias cuentas ---------------------------------------------------------------------------------
def test_el_mismo_id_de_tuya_se_puede_registrar_en_cuentas_distintas(client):
    _, _, a, _ = cuenta(client, "ana@example.com")
    _, _, b, _ = cuenta(client, "beto@example.com")
    assert a["id"] != b["id"] and a["tuya_id"] == b["tuya_id"] == TUYA


def test_en_la_misma_casa_el_id_sigue_sin_poder_repetirse(client):
    auth, casa, _, _ = cuenta(client, "ana@example.com")
    r = client.post(f"/hogares/{casa['id']}/dispositivos", json={"tuya_id": TUYA, "nombre": "Otro"}, headers=auth)
    assert r.status_code == 409 and "en esta casa" in r.json()["detail"]


def test_en_dos_casas_de_la_misma_cuenta_tambien_se_puede(client):
    auth, casa, _, _ = cuenta(client, "ana@example.com")
    otra = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=auth).json()
    assert client.post(f"/hogares/{otra['id']}/dispositivos", json={"tuya_id": TUYA, "nombre": "Ventilador"}, headers=auth).status_code == 201


# --- sin el modo de pruebas: cada cuenta solo ve lo que lee su propio agente --------------------------------------------------
def test_sin_compartir_las_lecturas_de_un_agente_no_llegan_a_otra_cuenta(client):
    _, _, a, token_a = cuenta(client, "ana@example.com")
    _, _, b, _ = cuenta(client, "beto@example.com")
    r = enviar(client, token_a, [lect(0), lect(5)]).json()
    assert r["guardadas"] == 2
    assert (lecturas_de(a["id"]), lecturas_de(b["id"])) == (2, 0)  # privacidad: lo de Ana no es de Beto


# --- con COMPARTIR_ENCHUFES ------------------------------------------------------------------------------------------------------
def test_con_compartir_las_lecturas_llegan_a_todas_las_cuentas_con_ese_enchufe(client, compartir):
    _, _, a, token_a = cuenta(client, "ana@example.com")
    _, _, b, _ = cuenta(client, "beto@example.com")
    _, _, c, _ = cuenta(client, "carla@example.com")
    r = enviar(client, token_a, [lect(0), lect(5), lect(10)]).json()
    assert r == {"recibidas": 3, "guardadas": 3, "duplicadas": 0, "desconocidas": 0, "de_otro_agente": 0}  # solo cuenta lo propio
    assert (lecturas_de(a["id"]), lecturas_de(b["id"]), lecturas_de(c["id"])) == (3, 3, 3)


def test_reenviar_no_duplica_en_ninguna_cuenta(client, compartir):
    _, _, a, token_a = cuenta(client, "ana@example.com")
    _, _, b, _ = cuenta(client, "beto@example.com")
    lote = [lect(0), lect(5)]
    enviar(client, token_a, lote)
    r = enviar(client, token_a, lote).json()
    assert (r["guardadas"], r["duplicadas"]) == (0, 2)
    assert (lecturas_de(a["id"]), lecturas_de(b["id"])) == (2, 2)


def test_cada_cuenta_recibe_sus_eventos_en_vivo_con_sus_propios_ids(client, compartir, publicado):
    _, casa_a, a, token_a = cuenta(client, "ana@example.com")
    _, casa_b, b, _ = cuenta(client, "beto@example.com")
    enviar(client, token_a, [lect(0)])
    assert {e["dispositivo_id"] for e in publicado[casa_a["id"]]} == {a["id"]}
    assert {e["dispositivo_id"] for e in publicado[casa_b["id"]]} == {b["id"]}  # el evento de Beto trae el id del enchufe de Beto


def test_el_cambio_de_estado_tambien_llega_a_la_otra_cuenta(client, compartir, publicado):
    _, _, _, token_a = cuenta(client, "ana@example.com")
    _, casa_b, b, _ = cuenta(client, "beto@example.com")
    enviar(client, token_a, [lect(10, True)])
    publicado.clear()
    enviar(client, token_a, [lect(0, False)])
    tipos = [e["tipo"] for e in publicado[casa_b["id"]]]
    assert "estado_enchufe" in tipos and "lectura" in tipos


def test_si_el_enchufe_de_ana_es_de_otro_agente_no_se_copia_nada(client, compartir):
    auth, casa, a, token_a = cuenta(client, "ana@example.com")
    _, _, b, _ = cuenta(client, "beto@example.com")
    otro = client.post(f"/hogares/{casa['id']}/agentes", json={"nombre": "Patio"}, headers=auth).json()
    client.patch(f"/hogares/{casa['id']}/dispositivos/{a['id']}", json={"agente_id": otro["id"]}, headers=auth)
    r = enviar(client, token_a, [lect(0)]).json()
    assert r["de_otro_agente"] == 1 and r["guardadas"] == 0
    assert (lecturas_de(a["id"]), lecturas_de(b["id"])) == (0, 0)


def test_una_cuenta_sin_el_enchufe_no_recibe_nada(client, compartir):
    _, _, _, token_a = cuenta(client, "ana@example.com")
    auth = registrar_y_entrar(client, "dani@example.com")
    casa = client.post("/hogares", json={"nombre": "Sin enchufe", "estrato": 3}, headers=auth).json()
    otro = client.post(f"/hogares/{casa['id']}/dispositivos", json={"tuya_id": "otro-enchufe", "nombre": "Lámpara"}, headers=auth).json()
    enviar(client, token_a, [lect(0)])
    assert lecturas_de(otro["id"]) == 0


# --- órdenes de prender y apagar ---------------------------------------------------------------------------------------------------
def conectar(casa, agente_id, respuesta=(True, None)):
    ws = SocketFalso(control.gestor_agentes, respuesta)
    control.gestor_agentes.conectar(uuid.UUID(casa["id"]), uuid.UUID(agente_id), ws)
    return ws


def preparar_ordenes(client, monkeypatch):
    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    control.limitador._marcas.clear()
    monkeypatch.setattr(control.cliente_tuya, "configurado", lambda: False)
    auth_a, casa_a, a, token_a = cuenta(client, "ana@example.com")
    auth_b, casa_b, b, _ = cuenta(client, "beto@example.com")
    enviar(client, token_a, [lect(0)])  # el enchufe de Ana toma a su agente
    agente_a = client.get(f"/hogares/{casa_a['id']}/agentes", headers=auth_a).json()[0]["id"]
    return auth_b, casa_a, agente_a, b


def test_con_compartir_beto_puede_apagar_el_enchufe_que_lee_el_agente_de_ana(client, compartir, monkeypatch):
    auth_b, casa_a, agente_a, b = preparar_ordenes(client, monkeypatch)
    ws = conectar(casa_a, agente_a)
    r = client.post(f"/dispositivos/{b['id']}/apagar", headers=auth_b)
    assert r.status_code == 200 and r.json()["via"] == "agente"
    assert ws.recibidos[0]["tuya_id"] == TUYA and ws.recibidos[0]["accion"] == "apagar"


def test_sin_compartir_beto_no_puede_mandar_ordenes_por_el_agente_de_ana(client, monkeypatch):
    auth_b, casa_a, agente_a, b = preparar_ordenes(client, monkeypatch)
    ws = conectar(casa_a, agente_a)
    r = client.post(f"/dispositivos/{b['id']}/apagar", headers=auth_b)
    assert r.status_code == 503
    assert ws.recibidos == []  # el agente de Ana nunca se enteró


def test_con_compartir_si_el_agente_de_ana_esta_caido_dice_por_que(client, compartir, monkeypatch):
    auth_b, casa_a, agente_a, b = preparar_ordenes(client, monkeypatch)
    r = client.post(f"/dispositivos/{b['id']}/apagar", headers=auth_b)
    assert r.status_code == 503 and "No se pudo apagar" in r.json()["detail"]
