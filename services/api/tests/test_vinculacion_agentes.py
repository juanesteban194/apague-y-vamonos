"""Vincular el programa del agente con un código de 6 dígitos y entregarle su configuración (ADR 0008)."""
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core import cifrado
from app.core.config import get_settings
from app.core.database import get_sessionmaker
from app.integrations.tuya_cloud.cliente import ErrorTuyaCloud
from app.modules.agentes import service
from app.modules.dispositivos.models import Dispositivo
from app.modules.hogares.models import Agente

from .conftest import registrar_y_entrar


@pytest.fixture(autouse=True)
def limpio(monkeypatch):
    service.limitador._marcas.clear()
    service._sin_clave_hasta.clear()


def con_codigo(client, auth, hogar, nombre="Sala"):
    r = client.post(f"/hogares/{hogar['id']}/agentes/con-codigo", json={"nombre": nombre}, headers=auth)
    assert r.status_code == 201
    return r.json()


def vincular(client, codigo):
    return client.post("/agentes/vincular", json={"codigo": codigo})


def cabecera(token):
    return {"Authorization": f"Bearer {token}"}


def guardar_clave(enchufe_id, clave):
    with get_sessionmaker()() as db:
        d = db.get(Dispositivo, enchufe_id)
        d.clave_local_cifrada = cifrado.cifrar(clave)
        db.commit()


# --- cifrado ---------------------------------------------------------------------------------------------------------
def test_cifrar_y_descifrar_sin_dejar_la_clave_a_la_vista():
    c = cifrado.cifrar("0123456789abcdef")
    assert "0123456789abcdef" not in c and cifrado.descifrar(c) == "0123456789abcdef"


def test_con_otra_clave_maestra_no_se_puede_descifrar(monkeypatch):
    c = cifrado.cifrar("secreto")
    monkeypatch.setattr(get_settings(), "clave_maestra", "otra-clave-maestra-distinta-" + "z" * 10)
    with pytest.raises(cifrado.ErrorCifrado):
        cifrado.descifrar(c)


def test_sin_clave_maestra_no_hay_cifrado(monkeypatch):
    monkeypatch.setattr(get_settings(), "clave_maestra", None)
    assert cifrado.disponible() is False
    with pytest.raises(cifrado.ErrorCifrado):
        cifrado.cifrar("x")


# --- crear con código y vincular -----------------------------------------------------------------------------------------
def test_crear_un_agente_da_un_codigo_de_6_digitos_y_aun_no_esta_vinculado(client, auth, hogar):
    a = con_codigo(client, auth, hogar)
    assert len(a["codigo"]) == 6 and a["codigo"].isdigit() and a["nombre"] == "Sala"
    lista = client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json()
    assert [(x["nombre"], x["vinculado"], x["conectado"], x["codigo_pendiente"]) for x in lista] == [("Sala", False, False, True)]


def test_el_codigo_no_se_guarda_en_claro(client, auth, hogar):
    a = con_codigo(client, auth, hogar)
    with get_sessionmaker()() as db:
        agente = db.get(Agente, a["id"])
        assert a["codigo"] not in (agente.codigo_hash or "")


def test_vincular_con_el_codigo_entrega_el_token_y_el_codigo_deja_de_servir(client, auth, hogar):
    a = con_codigo(client, auth, hogar)
    r = vincular(client, a["codigo"])
    assert r.status_code == 200
    v = r.json()
    assert v["agente_id"] == a["id"] and v["nombre"] == "Sala" and v["hogar_nombre"] == "Casa" and len(v["token"]) >= 30
    assert vincular(client, a["codigo"]).status_code == 404  # un solo uso
    assert client.get("/agentes/configuracion", headers=cabecera(v["token"])).status_code == 200
    estado = client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json()[0]
    assert estado["vinculado"] is True and estado["codigo_pendiente"] is False  # usar el código lo consume


def test_el_token_entregado_sirve_para_mandar_lecturas(client, auth, hogar, enchufe):
    from .test_ingesta import enviar, lectura

    v = vincular(client, con_codigo(client, auth, hogar)["codigo"]).json()
    assert enviar(client, v["token"], [lectura(0)]).json()["guardadas"] == 1


def test_un_codigo_vencido_no_sirve(client, auth, hogar):
    a = con_codigo(client, auth, hogar)
    with get_sessionmaker()() as db:
        db.get(Agente, a["id"]).codigo_expira_en = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    assert client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json()[0]["codigo_pendiente"] is False
    r = vincular(client, a["codigo"])
    assert r.status_code == 404 and "venció" in r.json()["detail"]


def test_un_codigo_inventado_no_sirve(client):
    assert vincular(client, "123456").status_code == 404


@pytest.mark.parametrize("malo", ["12345", "1234567", "abcdef", "12 456"])
def test_el_codigo_debe_ser_de_6_digitos(client, malo):
    assert vincular(client, malo).status_code == 422


def test_frena_a_quien_prueba_codigos_al_azar(client):
    estados = [vincular(client, f"{i:06d}").status_code for i in range(service.POR_ORIGEN_POR_MINUTO + 3)]
    assert estados[: service.POR_ORIGEN_POR_MINUTO] == [404] * service.POR_ORIGEN_POR_MINUTO
    assert estados[service.POR_ORIGEN_POR_MINUTO :] == [429] * 3


def test_codigo_nuevo_para_otro_computador_y_el_anterior_deja_de_servir(client, auth, hogar):
    a = con_codigo(client, auth, hogar)
    primero = vincular(client, a["codigo"]).json()
    nuevo = client.post(f"/hogares/{hogar['id']}/agentes/{a['id']}/codigo", headers=auth).json()
    assert nuevo["codigo"] != a["codigo"]
    # hasta usar el código nuevo, el programa anterior sigue funcionando
    assert client.get("/agentes/configuracion", headers=cabecera(primero["token"])).status_code == 200
    segundo = vincular(client, nuevo["codigo"]).json()
    assert client.get("/agentes/configuracion", headers=cabecera(primero["token"])).status_code == 401
    assert client.get("/agentes/configuracion", headers=cabecera(segundo["token"])).status_code == 200


def test_solo_el_titular_crea_agentes_y_no_de_casas_ajenas(client, auth, hogar):
    otro = registrar_y_entrar(client, "otro@example.com")
    assert client.post(f"/hogares/{hogar['id']}/agentes/con-codigo", json={"nombre": "X"}, headers=otro).status_code in (403, 404)
    a = con_codigo(client, auth, hogar)
    assert client.post(f"/hogares/{hogar['id']}/agentes/{a['id']}/codigo", headers=otro).status_code in (403, 404)


def test_un_agente_sin_vincular_no_puede_conectarse_con_nada(client, auth, hogar):
    con_codigo(client, auth, hogar)
    assert client.get("/agentes/configuracion", headers=cabecera("cualquiera")).status_code == 401


# --- configuración ----------------------------------------------------------------------------------------------------
def configurar(client, auth, hogar, enchufe, agente):
    r = client.patch(f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}", json={"agente_id": agente["id"]}, headers=auth)
    assert r.status_code == 200


def test_la_configuracion_trae_solo_los_enchufes_de_ese_agente_con_su_clave(client, auth, hogar, enchufe):
    sala, patio = con_codigo(client, auth, hogar, "Sala"), con_codigo(client, auth, hogar, "Patio")
    otro = client.post(f"/hogares/{hogar['id']}/dispositivos", json={"tuya_id": "z1", "nombre": "Lámpara", "agente_id": patio["id"]}, headers=auth).json()
    configurar(client, auth, hogar, enchufe, sala)
    guardar_clave(enchufe["id"], "clave-del-ventilador")
    guardar_clave(otro["id"], "clave-de-la-lampara")
    token = vincular(client, sala["codigo"]).json()["token"]
    c = client.get("/agentes/configuracion", headers=cabecera(token)).json()
    assert c["nombre"] == "Sala" and c["sin_clave"] == []
    assert c["enchufes"] == [{"tuya_id": enchufe["tuya_id"], "nombre": "Ventilador", "clave_local": "clave-del-ventilador"}]


def test_en_la_base_la_clave_esta_cifrada(client, auth, hogar, enchufe):
    guardar_clave(enchufe["id"], "clave-secreta-123")
    with get_sessionmaker()() as db:
        crudo = db.scalar(select(Dispositivo.clave_local_cifrada).where(Dispositivo.tuya_id == enchufe["tuya_id"]))
    assert crudo and "clave-secreta-123" not in crudo


def test_la_app_nunca_recibe_la_clave(client, auth, hogar, enchufe):
    guardar_clave(enchufe["id"], "clave-secreta-123")
    assert "clave-secreta-123" not in client.get(f"/hogares/{hogar['id']}/dispositivos", headers=auth).text
    assert "clave_local" not in client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).text


def test_un_enchufe_sin_clave_se_reporta_como_sin_clave(client, auth, hogar, enchufe, monkeypatch):
    monkeypatch.setattr(service.cliente_tuya, "configurado", lambda: False)
    sala = con_codigo(client, auth, hogar)
    configurar(client, auth, hogar, enchufe, sala)
    token = vincular(client, sala["codigo"]).json()["token"]
    c = client.get("/agentes/configuracion", headers=cabecera(token)).json()
    assert c["enchufes"] == [] and c["sin_clave"] == [enchufe["tuya_id"]]


def test_la_clave_que_falta_se_pide_a_tuya_una_vez_y_se_guarda_cifrada(client, auth, hogar, enchufe, monkeypatch):
    llamadas = []

    async def clave_local(tuya_id):
        llamadas.append(tuya_id)
        return "clave-desde-tuya"

    monkeypatch.setattr(service.cliente_tuya, "configurado", lambda: True)
    monkeypatch.setattr(service.cliente_tuya, "clave_local", clave_local)
    sala = con_codigo(client, auth, hogar)
    configurar(client, auth, hogar, enchufe, sala)
    token = vincular(client, sala["codigo"]).json()["token"]
    primero = client.get("/agentes/configuracion", headers=cabecera(token)).json()
    segundo = client.get("/agentes/configuracion", headers=cabecera(token)).json()
    assert primero["enchufes"][0]["clave_local"] == segundo["enchufes"][0]["clave_local"] == "clave-desde-tuya"
    assert llamadas == [enchufe["tuya_id"]]  # la segunda vez sale de la base: no gasta cuota
    with get_sessionmaker()() as db:
        assert "clave-desde-tuya" not in db.scalar(select(Dispositivo.clave_local_cifrada))


def test_si_tuya_no_la_da_no_se_insiste_cada_minuto(client, auth, hogar, enchufe, monkeypatch):
    llamadas = []

    async def clave_local(tuya_id):
        llamadas.append(tuya_id)
        raise ErrorTuyaCloud("no está en la cuenta vinculada")

    monkeypatch.setattr(service.cliente_tuya, "configurado", lambda: True)
    monkeypatch.setattr(service.cliente_tuya, "clave_local", clave_local)
    sala = con_codigo(client, auth, hogar)
    configurar(client, auth, hogar, enchufe, sala)
    token = vincular(client, sala["codigo"]).json()["token"]
    for _ in range(3):
        c = client.get("/agentes/configuracion", headers=cabecera(token)).json()
        assert c["sin_clave"] == [enchufe["tuya_id"]]
    assert len(llamadas) == 1


def test_sin_clave_maestra_la_configuracion_responde_igual(client, auth, hogar, enchufe, monkeypatch):
    sala = con_codigo(client, auth, hogar)
    configurar(client, auth, hogar, enchufe, sala)
    token = vincular(client, sala["codigo"]).json()["token"]
    monkeypatch.setattr(get_settings(), "clave_maestra", None)
    c = client.get("/agentes/configuracion", headers=cabecera(token))
    assert c.status_code == 200 and c.json()["sin_clave"] == [enchufe["tuya_id"]]


# --- cliente de Tuya Cloud: clave local ---------------------------------------------------------------------------------
def test_tuya_entrega_la_clave_local_con_2_llamadas_y_luego_1(monkeypatch):
    import asyncio

    import httpx

    from app.integrations.tuya_cloud.cliente import ClienteTuyaCloud

    s = get_settings()
    monkeypatch.setattr(s, "tuya_access_id", "id-prueba")
    monkeypatch.setattr(s, "tuya_access_secret", "secreto-prueba")
    vistas = []

    def manejador(request):
        vistas.append((request.method, request.url.path))
        if request.url.path == "/v1.0/token":
            return httpx.Response(200, json={"success": True, "result": {"access_token": "TK", "expire_time": 7200}})
        return httpx.Response(200, json={"success": True, "result": {"id": "dev1", "local_key": "abc123"}})

    c = ClienteTuyaCloud(httpx.AsyncClient(transport=httpx.MockTransport(manejador)))
    assert asyncio.run(c.clave_local("dev1")) == "abc123"
    assert vistas == [("GET", "/v1.0/token"), ("GET", "/v1.0/devices/dev1")]
    assert c.llamadas_del_mes() == 2


def test_tuya_sin_clave_en_la_respuesta_da_error_claro(monkeypatch):
    import asyncio

    import httpx

    from app.integrations.tuya_cloud.cliente import ClienteTuyaCloud

    s = get_settings()
    monkeypatch.setattr(s, "tuya_access_id", "id-prueba")
    monkeypatch.setattr(s, "tuya_access_secret", "secreto-prueba")

    def manejador(request):
        if request.url.path == "/v1.0/token":
            return httpx.Response(200, json={"success": True, "result": {"access_token": "TK", "expire_time": 7200}})
        return httpx.Response(200, json={"success": True, "result": {"id": "dev1"}})

    c = ClienteTuyaCloud(httpx.AsyncClient(transport=httpx.MockTransport(manejador)))
    with pytest.raises(ErrorTuyaCloud, match="no entregó la clave local"):
        asyncio.run(c.clave_local("dev1"))
