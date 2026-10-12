import jwt

from app.core.config import get_settings

from .conftest import registrar_y_entrar

CUERPO = {"email": "ana@example.com", "contrasena": "clave-segura-1", "nombre": "Ana", "acepta_tratamiento_datos": True}


def test_registro_exige_consentimiento(client):
    r = client.post("/auth/registro", json={**CUERPO, "acepta_tratamiento_datos": False})
    assert r.status_code == 422


def test_registro_duplicado_da_409(client):
    assert client.post("/auth/registro", json=CUERPO).status_code == 201
    assert client.post("/auth/registro", json={**CUERPO, "email": "ANA@example.com"}).status_code == 409


def test_login_correcto_e_incorrecto(client):
    client.post("/auth/registro", json=CUERPO)
    ok = client.post("/auth/login", json={"email": CUERPO["email"], "contrasena": CUERPO["contrasena"]})
    assert ok.status_code == 200 and ok.json()["token_type"] == "bearer"
    mal = client.post("/auth/login", json={"email": CUERPO["email"], "contrasena": "otra-clave-1"})
    assert mal.status_code == 401
    desconocido = client.post("/auth/login", json={"email": "no@example.com", "contrasena": "clave-segura-1"})
    assert desconocido.status_code == 401 and desconocido.json() == mal.json()


def test_vigencias_de_los_tokens(client):
    client.post("/auth/registro", json=CUERPO)
    t = client.post("/auth/login", json={"email": CUERPO["email"], "contrasena": CUERPO["contrasena"]}).json()
    clave = get_settings().jwt_secret
    acceso = jwt.decode(t["access_token"], clave, algorithms=["HS256"])
    renov = jwt.decode(t["refresh_token"], clave, algorithms=["HS256"])
    assert acceso["exp"] - acceso["iat"] == 15 * 60
    assert renov["exp"] - renov["iat"] == 30 * 24 * 3600


def test_renovar_solo_acepta_refresh(client):
    client.post("/auth/registro", json=CUERPO)
    t = client.post("/auth/login", json={"email": CUERPO["email"], "contrasena": CUERPO["contrasena"]}).json()
    assert client.post("/auth/renovar", json={"refresh_token": t["refresh_token"]}).status_code == 200
    assert client.post("/auth/renovar", json={"refresh_token": t["access_token"]}).status_code == 401


def test_endpoint_protegido_sin_token(client):
    assert client.get("/hogares").status_code == 401
    assert client.get("/hogares", headers={"Authorization": "Bearer basura"}).status_code == 401


def test_la_contrasena_se_guarda_con_argon2(client):
    from app.core.database import get_sessionmaker
    from app.modules.auth.models import Usuario

    registrar_y_entrar(client)
    with get_sessionmaker()() as db:
        assert db.query(Usuario).one().hash_contrasena.startswith("$argon2")
