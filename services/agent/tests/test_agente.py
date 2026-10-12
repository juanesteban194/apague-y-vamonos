"""El agente completo con un servidor simulado: caída de internet y recuperación sin perder ni duplicar lecturas."""
import json
import threading
import time
from pathlib import Path

import httpx

from agent.collector.lector import ErrorEnchufe
from agent.config.ajustes import Ajustes
from agent.principal import Agente


class LectorFalso:
    tuya_id, nombre = "id1", "Enchufe"

    def __init__(self):
        self.n = 0
        self.fallar_desde, self.fallar_hasta = None, None

    def leer(self):
        self.n += 1
        if self.fallar_desde and self.fallar_desde <= self.n < self.fallar_hasta:
            raise ErrorEnchufe("sin respuesta")
        return {"tuya_id": self.tuya_id, "fecha_hora": f"2026-10-12T00:00:00.{self.n:06d}+00:00", "potencia_w": float(self.n),
                "voltaje_v": 128.0, "corriente_ma": 1, "encendido": True}


class ServidorFalso:
    def __init__(self):
        self.caido = False
        self.recibidas: list[str] = []  # fecha_hora de cada lectura aceptada
        self.peticiones = 0

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.peticiones += 1
        if self.caido:
            raise httpx.ConnectError("sin internet")
        lecturas = json.loads(request.content)["lecturas"]
        nuevas = [l["fecha_hora"] for l in lecturas if l["fecha_hora"] not in self.recibidas]  # idempotente, como la API
        self.recibidas += nuevas
        return httpx.Response(200, json={"recibidas": len(lecturas), "guardadas": len(nuevas), "duplicadas": len(lecturas) - len(nuevas), "desconocidas": 0})


def correr(tmp_path, servidor, lector, segundos_de_prueba, durante=None):
    ajustes = Ajustes("https://api.test", "t", 0.02, Path("x"), tmp_path / "cola.sqlite")
    cliente = httpx.Client(base_url=ajustes.api_url, transport=httpx.MockTransport(servidor))
    parar = threading.Event()
    agente = threading.Thread(target=Agente(ajustes, [lector], cliente).correr, args=(parar,))
    agente.start()
    if durante:
        durante()
    time.sleep(segundos_de_prueba)
    parar.set()
    agente.join(timeout=15)
    assert not agente.is_alive()
    return ajustes


def esperar(condicion, limite=10):
    fin = time.monotonic() + limite
    while time.monotonic() < fin and not condicion():
        time.sleep(0.02)
    return condicion()


def test_envia_las_lecturas_a_la_api(tmp_path):
    servidor, lector = ServidorFalso(), LectorFalso()
    correr(tmp_path, servidor, lector, 0.5)
    assert len(servidor.recibidas) >= 10
    assert servidor.recibidas == sorted(servidor.recibidas)


def test_caida_de_internet_no_pierde_ni_duplica(tmp_path):
    servidor, lector = ServidorFalso(), LectorFalso()

    def caida():
        assert esperar(lambda: len(servidor.recibidas) >= 5)
        servidor.caido = True
        n_al_caer = lector.n
        assert esperar(lambda: lector.n >= n_al_caer + 40)  # siguen leyendo con internet caído
        servidor.caido = False
        # el envío usa espera creciente (≤ 30 s): en la prueba se reintenta enseguida porque la espera inicial es 1-2 s
        assert esperar(lambda: len(servidor.recibidas) >= lector.n - 5, limite=20)

    correr(tmp_path, servidor, lector, 0.3, durante=caida)
    # todas las lecturas leídas (menos las que no alcanzaron a salir al parar) llegaron, en orden y sin repetir
    esperadas = [f"2026-10-12T00:00:00.{i:06d}+00:00" for i in range(1, len(servidor.recibidas) + 1)]
    assert servidor.recibidas == esperadas
    assert len(set(servidor.recibidas)) == len(servidor.recibidas)


def test_si_el_enchufe_falla_un_rato_el_agente_sigue(tmp_path):
    servidor, lector = ServidorFalso(), LectorFalso()
    lector.fallar_desde, lector.fallar_hasta = 5, 15
    correr(tmp_path, servidor, lector, 0.6)
    assert len(servidor.recibidas) >= 15  # tras el fallo retoma las lecturas


def test_las_lecturas_encoladas_sobreviven_a_un_reinicio(tmp_path):
    servidor, lector = ServidorFalso(), LectorFalso()
    servidor.caido = True
    ajustes = correr(tmp_path, servidor, lector, 0.4)  # nada sale: todo queda en el archivo
    assert servidor.recibidas == []
    from agent.buffer.cola import Cola

    guardadas = Cola(ajustes.ruta_cola).pendientes()
    assert guardadas >= 10

    servidor.caido = False  # "reinicio" del agente con el mismo archivo
    nuevo = LectorFalso()
    nuevo.n = 10_000
    correr(tmp_path, servidor, nuevo, 0.8)
    assert len([f for f in servidor.recibidas if ".00" in f[:30] and int(f[20:26]) < 10_000]) >= guardadas
