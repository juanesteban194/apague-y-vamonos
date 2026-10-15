"""Derecho de supresión (Ley 1581): la persona puede borrar su cuenta y sus datos."""
import uuid

from sqlalchemy import select, text

from app.core.database import get_sessionmaker
from app.modules.auth.models import Usuario
from app.modules.hogares.models import MiembroHogar

from .conftest import registrar_y_entrar

CLAVE = "clave-segura-1"


def contar(tabla):
    with get_sessionmaker()() as db:
        return db.scalar(text(f"select count(*) from {tabla}"))


def borrar(client, auth, contrasena=CLAVE):
    return client.request("DELETE", "/auth/yo", json={"contrasena": contrasena}, headers=auth)


def test_se_borra_la_cuenta_y_su_casa_con_todo_lo_suyo(client, auth, hogar, enchufe):
    client.post(f"/hogares/{hogar['id']}/agentes", json={"nombre": "Mac"}, headers=auth)
    client.post(f"/hogares/{hogar['id']}/lecturas-medidor", json={"lectura_kwh": 100}, headers=auth)
    client.put("/usuarios/yo/tokens-push", json={"token": "ExponentPushToken[abc]", "plataforma": "android"}, headers=auth)
    assert borrar(client, auth).status_code == 204
    for tabla in ("usuarios", "hogares", "miembros_hogar", "dispositivos", "agentes", "lecturas_medidor", "tokens_push"):
        assert contar(tabla) == 0, tabla


def test_la_contrasena_equivocada_no_borra_nada(client, auth, hogar):
    r = borrar(client, auth, "otra-contrasena")
    assert r.status_code == 403 and "contraseña" in r.json()["detail"]
    assert contar("usuarios") == 1 and contar("hogares") == 1


def test_sin_contrasena_en_una_cuenta_con_contrasena_tampoco(client, auth, hogar):
    assert client.request("DELETE", "/auth/yo", headers=auth).status_code == 403
    assert contar("usuarios") == 1


def test_una_cuenta_de_google_sin_contrasena_se_borra_sin_pedirla(client):
    from app.core.security import crear_token_acceso

    with get_sessionmaker()() as db:
        u = Usuario(email="g@example.com", nombre="Gabriela", google_sub="sub-1")
        db.add(u)
        db.commit()
        token = crear_token_acceso(u.id)
    auth = {"Authorization": f"Bearer {token}"}
    assert client.request("DELETE", "/auth/yo", headers=auth).status_code == 204
    assert contar("usuarios") == 0


def test_quien_no_acepto_el_tratamiento_de_datos_tambien_puede_irse(client):
    from app.core.security import crear_token_acceso

    with get_sessionmaker()() as db:
        u = Usuario(email="n@example.com", nombre="Nuevo", google_sub="sub-2", consentimiento_datos_en=None)
        db.add(u)
        db.commit()
        token = crear_token_acceso(u.id)
    assert client.request("DELETE", "/auth/yo", headers={"Authorization": f"Bearer {token}"}).status_code == 204


def test_sin_sesion_no_borra_nada(client, auth, hogar):
    assert client.request("DELETE", "/auth/yo", json={"contrasena": CLAVE}).status_code in (401, 403)
    assert contar("usuarios") == 1


def test_el_correo_queda_libre_para_registrarse_de_nuevo(client, auth):
    assert borrar(client, auth).status_code == 204
    r = client.post("/auth/registro", json={"email": "ana@example.com", "contrasena": CLAVE, "nombre": "Ana", "acepta_tratamiento_datos": True})
    assert r.status_code == 201


def test_en_una_casa_compartida_solo_se_va_la_persona_y_el_otro_queda_de_titular(client, auth, hogar):
    otro = registrar_y_entrar(client, "otro@example.com")
    with get_sessionmaker()() as db:
        otro_id = db.scalar(select(Usuario.id).where(Usuario.email == "otro@example.com"))
        db.add(MiembroHogar(usuario_id=otro_id, hogar_id=uuid.UUID(hogar["id"]), rol="familiar"))
        db.commit()
    assert borrar(client, auth).status_code == 204
    assert contar("hogares") == 1  # la casa sigue
    with get_sessionmaker()() as db:
        miembros = list(db.scalars(select(MiembroHogar)))
        assert [(m.usuario_id, m.rol) for m in miembros] == [(otro_id, "titular")]  # no queda sin dueño
    assert client.get("/hogares", headers=otro).json()[0]["id"] == hogar["id"]


def test_las_casas_de_otros_no_se_tocan(client, auth, hogar):
    otro = registrar_y_entrar(client, "otro@example.com")
    client.post("/hogares", json={"nombre": "De otro", "estrato": 2}, headers=otro)
    assert borrar(client, auth).status_code == 204
    assert [h["nombre"] for h in client.get("/hogares", headers=otro).json()] == ["De otro"]


def test_borrar_la_cuenta_corta_los_canales_de_sus_agentes(client, auth, hogar, monkeypatch):
    from app.modules.dispositivos import control

    from .test_borrar_casa_y_lecturas import SocketCerrable

    monkeypatch.setattr(control.gestor_agentes, "_por_hogar", {})
    a = client.post(f"/hogares/{hogar['id']}/agentes/con-codigo", json={"nombre": "Sala"}, headers=auth).json()
    ws = SocketCerrable(control.gestor_agentes)
    control.gestor_agentes.conectar(uuid.UUID(hogar["id"]), uuid.UUID(a["id"]), ws)
    assert borrar(client, auth).status_code == 204
    assert ws.cerrado == 4401
