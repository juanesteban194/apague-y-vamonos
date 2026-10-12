import json

import httpx
import pytest

from agent.buffer.cola import Cola
from agent.enviador import Enviador, ErrorAutenticacion, ErrorRed


def lectura(n):
    return {"tuya_id": "id1", "fecha_hora": f"2026-10-12T00:00:{n:02d}+00:00", "potencia_w": 1.0, "voltaje_v": 128.0, "corriente_ma": 1, "encendido": True}


def montar(tmp_path, manejador, n=5, lote=500):
    cola = Cola(tmp_path / "c.sqlite")
    for i in range(n):
        cola.agregar(lectura(i))
    cliente = httpx.Client(base_url="https://api.test", transport=httpx.MockTransport(manejador))
    return cola, Enviador(cola, cliente, lote=lote)


def ok(request):
    n = len(json.loads(request.content)["lecturas"])
    return httpx.Response(200, json={"recibidas": n, "guardadas": n, "duplicadas": 0, "desconocidas": 0})


def test_envio_correcto_vacia_la_cola(tmp_path):
    cola, env = montar(tmp_path, ok)
    assert env.enviar_lote() == 5
    assert cola.pendientes() == 0
    assert env.enviar_lote() == 0  # cola vacía: no hace peticiones


def test_respeta_el_tamano_de_lote_y_el_orden(tmp_path):
    vistos = []

    def manejador(request):
        lecturas = json.loads(request.content)["lecturas"]
        vistos.append([l["fecha_hora"][17:19] for l in lecturas])
        return ok(request)

    cola, env = montar(tmp_path, manejador, n=5, lote=2)
    while env.enviar_lote():
        pass
    assert vistos == [["00", "01"], ["02", "03"], ["04"]]


def test_error_del_servidor_conserva_todo(tmp_path):
    cola, env = montar(tmp_path, lambda r: httpx.Response(503))
    with pytest.raises(ErrorRed):
        env.enviar_lote()
    assert cola.pendientes() == 5


def test_sin_red_conserva_todo(tmp_path):
    def sin_red(request):
        raise httpx.ConnectError("sin internet")

    cola, env = montar(tmp_path, sin_red)
    with pytest.raises(ErrorRed):
        env.enviar_lote()
    assert cola.pendientes() == 5


def test_token_invalido_lanza_y_conserva(tmp_path):
    cola, env = montar(tmp_path, lambda r: httpx.Response(401, json={"detail": "x"}))
    with pytest.raises(ErrorAutenticacion):
        env.enviar_lote()
    assert cola.pendientes() == 5


def test_una_url_mal_puesta_no_borra_nada(tmp_path):
    cola, env = montar(tmp_path, lambda r: httpx.Response(404))
    with pytest.raises(ErrorRed):
        env.enviar_lote()
    assert cola.pendientes() == 5


def test_una_lectura_invalida_no_atasca_la_cola(tmp_path):
    def manejador(request):
        lecturas = json.loads(request.content)["lecturas"]
        if any(l["potencia_w"] < 0 for l in lecturas):
            return httpx.Response(422, json={"detail": "mala"})
        return ok(request)

    cola = Cola(tmp_path / "c.sqlite")
    cola.agregar(lectura(0))
    cola.agregar({**lectura(1), "potencia_w": -5})
    cola.agregar(lectura(2))
    env = Enviador(cola, httpx.Client(base_url="https://api.test", transport=httpx.MockTransport(manejador)))
    assert env.enviar_lote() == 3  # las 3 salen de la cola: 2 enviadas y 1 descartada
    assert cola.pendientes() == 0
