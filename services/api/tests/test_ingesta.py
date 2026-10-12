from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.core.database import get_sessionmaker
from app.modules.hogares.models import Agente
from app.modules.ingesta.models import Lectura

T0 = datetime(2026, 10, 11, 21, 0, 0, tzinfo=UTC)


def lectura(i=0, tuya_id="eb182b7a119cf6aaeecf66", **extra):
    return {
        "tuya_id": tuya_id,
        "fecha_hora": (T0 + timedelta(seconds=5 * i)).isoformat(),
        "potencia_w": 26.5,
        "voltaje_v": 128.1,
        "corriente_ma": 221,
        "encendido": True,
        **extra,
    }


def enviar(client, token, lecturas):
    return client.post("/ingesta/lecturas", json={"lecturas": lecturas}, headers={"Authorization": f"Bearer {token}"})


def contar() -> int:
    with get_sessionmaker()() as db:
        return db.scalar(select(func.count()).select_from(Lectura))


def test_guarda_lecturas(client, agente_token, enchufe):
    r = enviar(client, agente_token, [lectura(i) for i in range(3)])
    assert r.status_code == 200
    assert r.json() == {"recibidas": 3, "guardadas": 3, "duplicadas": 0, "desconocidas": 0}
    assert contar() == 3


def test_reenviar_no_duplica(client, agente_token, enchufe):
    enviar(client, agente_token, [lectura(0), lectura(1)])
    r = enviar(client, agente_token, [lectura(1), lectura(2)])  # el agente reenvía tras una caída
    assert r.json() == {"recibidas": 2, "guardadas": 1, "duplicadas": 1, "desconocidas": 0}
    assert contar() == 3


def test_dispositivo_ajeno_o_desconocido_no_se_guarda(client, agente_token, enchufe):
    r = enviar(client, agente_token, [lectura(0), lectura(0, tuya_id="no-es-de-este-hogar")])
    assert r.json() == {"recibidas": 2, "guardadas": 1, "duplicadas": 0, "desconocidas": 1}


def test_agente_de_otro_hogar_no_escribe_en_este(client, auth, hogar, enchufe):
    # Segundo hogar con su propio agente: el enchufe del primero le es desconocido.
    h2 = client.post("/hogares", json={"nombre": "Otra", "estrato": 2}, headers=auth).json()
    t2 = client.post(f"/hogares/{h2['id']}/agentes", json={"nombre": "A2"}, headers=auth).json()["token"]
    r = enviar(client, t2, [lectura(0)])
    assert r.json()["desconocidas"] == 1 and contar() == 0


def test_token_invalido_o_ausente(client, agente_token):
    assert enviar(client, "token-falso", [lectura()]).status_code == 401
    assert client.post("/ingesta/lecturas", json={"lecturas": [lectura()]}).status_code == 401


def test_un_token_de_usuario_no_sirve_como_agente(client, auth, enchufe):
    token_usuario = auth["Authorization"].removeprefix("Bearer ")
    assert enviar(client, token_usuario, [lectura()]).status_code == 401


def test_validacion(client, agente_token, enchufe):
    assert enviar(client, agente_token, []).status_code == 422
    assert enviar(client, agente_token, [lectura(potencia_w=-1)]).status_code == 422
    sin_zona = lectura(fecha_hora="2026-10-11T21:00:00")
    assert enviar(client, agente_token, [sin_zona]).status_code == 422


def test_registra_ultima_conexion(client, agente_token, enchufe):
    enviar(client, agente_token, [lectura()])
    with get_sessionmaker()() as db:
        assert db.scalar(select(Agente.ultima_conexion)) is not None
