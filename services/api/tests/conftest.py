"""Pruebas contra PostgreSQL real. Usa una base aparte `<nombre>_test` en el mismo servidor
de DATABASE_URL; nunca toca la base de desarrollo."""
import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError

os.environ.setdefault("JWT_SECRET", "secreto-solo-para-pruebas-" + "x" * 16)
os.environ["JOBS_ACTIVOS"] = "false"  # las pruebas llaman las tareas a mano; el planificador no corre solo

from app.core import database  # noqa: E402
from app.core.config import get_settings  # noqa: E402

_RAIZ = Path(__file__).resolve().parents[1]
_URL_DESARROLLO = make_url(get_settings().database_url)
_NOMBRE_PRUEBAS = f"{_URL_DESARROLLO.database}_test"
_URL_PRUEBAS = _URL_DESARROLLO.set(database=_NOMBRE_PRUEBAS)

os.environ["DATABASE_URL"] = _URL_PRUEBAS.render_as_string(hide_password=False)
get_settings.cache_clear()


def _crear_base_si_falta() -> None:
    admin = create_engine(_URL_DESARROLLO, isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as con:
            existe = con.scalar(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": _NOMBRE_PRUEBAS})
            if not existe:
                con.execute(text(f'CREATE DATABASE "{_NOMBRE_PRUEBAS}"'))
    except OperationalError as e:
        pytest.exit(f"No hay PostgreSQL en DATABASE_URL (¿docker compose up?): {e.orig}", returncode=2)
    finally:
        admin.dispose()


@pytest.fixture(scope="session", autouse=True)
def base_migrada():
    """Aplica las migraciones Alembic desde cero: así también se prueban."""
    _crear_base_si_falta()
    engine = database.get_engine()
    with engine.begin() as con:
        con.execute(text("DROP SCHEMA public CASCADE"))
        con.execute(text("CREATE SCHEMA public"))
    cfg = Config(str(_RAIZ / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RAIZ / "migrations"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def tablas_vacias(base_migrada):
    yield
    with database.get_engine().begin() as con:
        tablas = con.scalars(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'alembic_version'")
        ).all()
        con.execute(text("TRUNCATE " + ", ".join(f'"{t}"' for t in tablas) + " CASCADE"))


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


def registrar_y_entrar(client, email="ana@example.com", nombre="Ana") -> dict:
    cuerpo = {"email": email, "contrasena": "clave-segura-1", "nombre": nombre, "acepta_tratamiento_datos": True}
    assert client.post("/auth/registro", json=cuerpo).status_code == 201
    r = client.post("/auth/login", json={"email": email, "contrasena": "clave-segura-1"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def auth(client):
    return registrar_y_entrar(client)


@pytest.fixture
def hogar(client, auth) -> dict:
    r = client.post("/hogares", json={"nombre": "Casa", "estrato": 3}, headers=auth)
    assert r.status_code == 201
    return r.json()


@pytest.fixture
def agente_token(client, auth, hogar) -> str:
    r = client.post(f"/hogares/{hogar['id']}/agentes", json={"nombre": "Mac"}, headers=auth)
    assert r.status_code == 201
    return r.json()["token"]


@pytest.fixture
def enchufe(client, auth, hogar) -> dict:
    r = client.post(
        f"/hogares/{hogar['id']}/dispositivos",
        json={"tuya_id": "eb182b7a119cf6aaeecf66", "nombre": "Ventilador"},
        headers=auth,
    )
    assert r.status_code == 201
    return r.json()
