"""Borrar una casa con todo lo suyo, revocar un agente conectado y corregir lecturas del medidor."""
import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select, text

from app.core.database import get_sessionmaker
from app.modules.alertas import service as alertas
from app.modules.hogares.models import Hogar
from app.realtime.agentes import GestorAgentes

from .conftest import registrar_y_entrar
from .test_alertas import lecturas
from .test_control import SocketFalso
from .test_rutinas import crear_rutina
from .test_semaforo import historial

TABLAS_DE_LA_CASA = [
    "dispositivos", "lecturas", "consumo_horario", "agentes", "alertas", "preferencias_alertas", "lecturas_medidor",
    "prepago_saldos", "rutinas", "eventos_rutina", "historial_facturas", "miembros_hogar",
]


def contar(tabla):
    with get_sessionmaker()() as db:
        return db.scalar(text(f"select count(*) from {tabla}"))


def llenar_la_casa(client, auth, hogar, enchufe):
    """Un poco de todo lo que una casa acumula."""
    ahora = datetime.now(UTC)
    lecturas(uuid.UUID(enchufe["id"]), ahora - timedelta(minutes=5), ahora)
    client.post(f"/hogares/{hogar['id']}/agentes", json={"nombre": "Mac"}, headers=auth)
    client.post(f"/hogares/{hogar['id']}/lecturas-medidor", json={"lectura_kwh": 100}, headers=auth)
    client.put(f"/hogares/{hogar['id']}/prepago", json={"saldo_cop": 20000}, headers=auth)
    client.put(f"/hogares/{hogar['id']}/preferencias-alertas", json={"sensibilidad": "todos"}, headers=auth)
    historial(client, auth, hogar)
    crear_rutina(client, auth, hogar, enchufe)
    with get_sessionmaker()() as db:
        alertas.crear(db, uuid.UUID(hogar["id"]), "prepago", "rojo", "t", "m")
        db.execute(text("insert into consumo_horario (dispositivo_id, hora, kwh, costo_cop) select id, now(), 1, 1 from dispositivos"))
        db.commit()


# --- borrar la casa -------------------------------------------------------------------------------------------------------
def test_borrar_la_casa_borra_todo_lo_suyo(client, auth, hogar, enchufe):
    llenar_la_casa(client, auth, hogar, enchufe)
    assert all(contar(t) > 0 for t in TABLAS_DE_LA_CASA if t != "eventos_rutina"), "la prueba debe partir con datos en cada tabla"
    assert client.delete(f"/hogares/{hogar['id']}", headers=auth).status_code == 204
    assert {t: contar(t) for t in TABLAS_DE_LA_CASA if t != "miembros_hogar"} == {t: 0 for t in TABLAS_DE_LA_CASA if t != "miembros_hogar"}
    assert contar("miembros_hogar") == 0 and contar("hogares") == 0
    assert client.get("/hogares", headers=auth).json() == []


def test_borrar_una_casa_no_toca_las_otras(client, auth, hogar, enchufe):
    otra = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=auth).json()
    client.post(f"/hogares/{otra['id']}/dispositivos", json={"tuya_id": "z9", "nombre": "Lámpara"}, headers=auth)
    assert client.delete(f"/hogares/{hogar['id']}", headers=auth).status_code == 204
    assert [h["nombre"] for h in client.get("/hogares", headers=auth).json()] == ["Otra"]
    assert [d["nombre"] for d in client.get(f"/hogares/{otra['id']}/dispositivos", headers=auth).json()] == ["Lámpara"]


def test_el_tuya_id_de_una_casa_borrada_queda_libre(client, auth, hogar, enchufe):
    client.delete(f"/hogares/{hogar['id']}", headers=auth)
    nueva = client.post("/hogares", json={"nombre": "Nueva", "estrato": 3}, headers=auth).json()
    r = client.post(f"/hogares/{nueva['id']}/dispositivos", json={"tuya_id": enchufe["tuya_id"], "nombre": "Ventilador"}, headers=auth)
    assert r.status_code == 201


def test_no_se_puede_borrar_la_casa_de_otro(client, auth, hogar):
    otro = registrar_y_entrar(client, "otro@example.com")
    assert client.delete(f"/hogares/{hogar['id']}", headers=otro).status_code == 403
    assert contar("hogares") == 1


def test_borrar_una_casa_que_no_existe_o_sin_sesion(client, auth):
    assert client.delete(f"/hogares/{uuid.uuid4()}", headers=auth).status_code == 403  # no es miembro de nada con ese id
    assert client.delete(f"/hogares/{uuid.uuid4()}").status_code in (401, 403)


def test_las_lecturas_ya_no_se_pueden_mandar_con_el_token_de_una_casa_borrada(client, auth, hogar, enchufe, agente_token):
    from .test_ingesta import enviar, lectura

    assert enviar(client, agente_token, [lectura(0)]).status_code == 200
    client.delete(f"/hogares/{hogar['id']}", headers=auth)
    assert enviar(client, agente_token, [lectura(1)]).status_code == 401


# --- cortar el canal de un agente eliminado ---------------------------------------------------------------------------------
class SocketCerrable(SocketFalso):
    def __init__(self, gestor):
        super().__init__(gestor, None)
        self.cerrado = None

    async def close(self, code=1000):
        self.cerrado = code


def test_el_gestor_corta_el_canal_de_un_agente_o_de_toda_la_casa():
    async def caso():
        g, hogar, a1, a2 = GestorAgentes(), uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        w1, w2 = SocketCerrable(g), SocketCerrable(g)
        g.conectar(hogar, a1, w1)
        g.conectar(hogar, a2, w2)
        await g.cerrar(hogar, a1)
        assert (w1.cerrado, w2.cerrado) == (4401, None)
        await g.cerrar(hogar)
        assert w2.cerrado == 4401

    asyncio.run(caso())


def test_cerrar_un_canal_ya_caido_no_falla():
    class Roto:
        async def close(self, code=1000):
            raise RuntimeError("ya estaba cerrado")

    async def caso():
        g, hogar, a = GestorAgentes(), uuid.uuid4(), uuid.uuid4()
        g.conectar(hogar, a, Roto())
        await g.cerrar(hogar, a)

    asyncio.run(caso())


def test_eliminar_un_agente_conectado_le_corta_el_canal(client, auth, hogar, monkeypatch):
    from app.modules.dispositivos import control

    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    a = client.post(f"/hogares/{hogar['id']}/agentes/con-codigo", json={"nombre": "Sala"}, headers=auth).json()
    ws = SocketCerrable(control.gestor_agentes)
    control.gestor_agentes.conectar(uuid.UUID(hogar["id"]), uuid.UUID(a["id"]), ws)
    assert client.delete(f"/hogares/{hogar['id']}/agentes/{a['id']}", headers=auth).status_code == 204
    assert ws.cerrado == 4401


# --- corregir lecturas del medidor ---------------------------------------------------------------------------------------------
def anotar(client, auth, hogar, kwh, fecha=None):
    cuerpo = {"lectura_kwh": kwh, **({"fecha": fecha} if fecha else {})}
    return client.post(f"/hogares/{hogar['id']}/lecturas-medidor", json=cuerpo, headers=auth)


def test_una_lectura_mal_digitada_se_borra_y_se_anota_la_correcta(client, auth, hogar):
    mala = anotar(client, auth, hogar, 4523800, "2026-10-10").json()  # un cero de más
    assert anotar(client, auth, hogar, 45238, "2026-10-12").status_code == 422  # la lectura mala bloquea las correctas
    assert client.delete(f"/hogares/{hogar['id']}/lecturas-medidor/{mala['id']}", headers=auth).status_code == 204
    assert anotar(client, auth, hogar, 45238, "2026-10-12").status_code == 201
    assert [l["lectura_kwh"] for l in client.get(f"/hogares/{hogar['id']}/lecturas-medidor", headers=auth).json()] == [45238]


def test_no_se_borra_una_lectura_de_otra_casa(client, auth, hogar):
    otro = registrar_y_entrar(client, "otro@example.com")
    otra_casa = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=otro).json()
    ajena = anotar(client, otro, otra_casa, 100).json()
    r = client.delete(f"/hogares/{hogar['id']}/lecturas-medidor/{ajena['id']}", headers=auth)
    assert r.status_code == 404
    assert client.delete(f"/hogares/{otra_casa['id']}/lecturas-medidor/{ajena['id']}", headers=auth).status_code == 403
    assert contar("lecturas_medidor") == 1


def test_borrar_una_lectura_que_no_existe(client, auth, hogar):
    assert client.delete(f"/hogares/{hogar['id']}/lecturas-medidor/{uuid.uuid4()}", headers=auth).status_code == 404
