from .conftest import registrar_y_entrar


def test_crear_y_listar_hogar(client, auth, hogar):
    assert hogar["rol"] == "titular" and hogar["limite_subsistencia_kwh"] == 130
    lista = client.get("/hogares", headers=auth).json()
    assert [h["id"] for h in lista] == [hogar["id"]]


def test_estrato_invalido(client, auth):
    assert client.post("/hogares", json={"nombre": "X", "estrato": 7}, headers=auth).status_code == 422


def test_otro_usuario_no_ve_ni_toca_el_hogar(client, hogar, enchufe):
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get("/hogares", headers=otro).json() == []
    assert client.get(f"/hogares/{hogar['id']}/dispositivos", headers=otro).status_code == 403
    assert client.post(f"/hogares/{hogar['id']}/agentes", json={"nombre": "x"}, headers=otro).status_code == 403
    r = client.post(f"/hogares/{hogar['id']}/dispositivos", json={"tuya_id": "z", "nombre": "z"}, headers=otro)
    assert r.status_code == 403


def test_tuya_id_duplicado(client, auth, hogar, enchufe):
    r = client.post(
        f"/hogares/{hogar['id']}/dispositivos",
        json={"tuya_id": enchufe["tuya_id"], "nombre": "Otro"},
        headers=auth,
    )
    assert r.status_code == 409


def test_token_de_agente_se_guarda_como_hash(client, auth, hogar, agente_token):
    from app.core.database import get_sessionmaker
    from app.modules.hogares.models import Agente

    with get_sessionmaker()() as db:
        agente = db.query(Agente).one()
        assert agente.token_hash != agente_token and len(agente.token_hash) == 64
