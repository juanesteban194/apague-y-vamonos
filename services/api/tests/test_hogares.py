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


def test_titular_edita_el_hogar(client, auth, hogar):
    r = client.patch(f"/hogares/{hogar['id']}", json={"nombre": "Mi casa", "estrato": 4, "barrio": "Laureles"}, headers=auth)
    assert r.status_code == 200 and (r.json()["nombre"], r.json()["estrato"], r.json()["barrio"]) == ("Mi casa", 4, "Laureles")
    # campos obligatorios no se borran con null; estrato fuera de rango se rechaza
    assert client.patch(f"/hogares/{hogar['id']}", json={"nombre": None}, headers=auth).json()["nombre"] == "Mi casa"
    assert client.patch(f"/hogares/{hogar['id']}", json={"estrato": 9}, headers=auth).status_code == 422


def test_otro_usuario_no_edita_el_hogar(client, hogar):
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.patch(f"/hogares/{hogar['id']}", json={"nombre": "x"}, headers=otro).status_code == 403


def test_agentes_se_listan_y_se_revocan(client, auth, hogar, agente_token):
    lista = client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json()
    assert len(lista) == 1 and "token" not in lista[0] and "token_hash" not in lista[0]
    assert client.delete(f"/hogares/{hogar['id']}/agentes/{lista[0]['id']}", headers=auth).status_code == 204
    assert client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json() == []
    # el token revocado deja de servir
    r = client.post("/ingesta/lecturas", json={"lecturas": []}, headers={"Authorization": f"Bearer {agente_token}"})
    assert r.status_code in (401, 422)
    assert client.delete(f"/hogares/{hogar['id']}/agentes/{lista[0]['id']}", headers=auth).status_code == 404


def test_otro_usuario_no_ve_ni_revoca_agentes(client, hogar, agente_token, auth):
    agente_id = client.get(f"/hogares/{hogar['id']}/agentes", headers=auth).json()[0]["id"]
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    assert client.get(f"/hogares/{hogar['id']}/agentes", headers=otro).status_code == 403
    assert client.delete(f"/hogares/{hogar['id']}/agentes/{agente_id}", headers=otro).status_code == 403


def test_editar_y_borrar_un_enchufe(client, auth, hogar, enchufe):
    url = f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}"
    r = client.patch(url, json={"nombre": "Nevera", "alto_riesgo": True, "umbral_minutos_encendido": 90, "tuya_id": "no-cambia"}, headers=auth)
    assert r.status_code == 200
    assert (r.json()["nombre"], r.json()["alto_riesgo"], r.json()["umbral_minutos_encendido"]) == ("Nevera", True, 90)
    assert r.json()["tuya_id"] == enchufe["tuya_id"]  # el ID de Tuya no se edita
    assert client.delete(url, headers=auth).status_code == 204
    assert client.get(f"/hogares/{hogar['id']}/dispositivos", headers=auth).json() == []
    assert client.delete(url, headers=auth).status_code == 404


def test_otro_usuario_no_toca_enchufes_ajenos(client, hogar, enchufe):
    otro = registrar_y_entrar(client, email="beto@example.com", nombre="Beto")
    url = f"/hogares/{hogar['id']}/dispositivos/{enchufe['id']}"
    assert client.patch(url, json={"nombre": "x"}, headers=otro).status_code == 403
    assert client.delete(url, headers=otro).status_code == 403
