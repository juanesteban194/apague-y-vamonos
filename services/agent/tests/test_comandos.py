import json
import threading
import time
from pathlib import Path

import pytest
from websockets.sync.server import serve

from agent.collector.lector import ErrorEnchufe
from agent.collector.simulador import LectorSimulado
from agent.commands.cliente import ClienteComandos, TokenRechazado, url_del_canal
from agent.config.ajustes import Ajustes

from .test_lector import DPS, EnchufeFalso, lector_con


class EnchufeConOrdenes(EnchufeFalso):
    def __init__(self, respuestas, error=None):
        super().__init__(respuestas)
        self.ordenes, self.error = [], error

    def turn_on(self):
        self.ordenes.append("on")
        return self.error or {"dps": {"1": True}}

    def turn_off(self):
        self.ordenes.append("off")
        return self.error or {"dps": {"1": False}}


def test_url_del_canal():
    assert url_del_canal("https://api.test/") == "wss://api.test/ws/agente"
    assert url_del_canal("http://127.0.0.1:8000") == "ws://127.0.0.1:8000/ws/agente"


# --- el lector real ----------------------------------------------------------------------------------------------------
def lector_con_ordenes(error=None):
    dispositivos = []

    def fabrica(*_):
        e = EnchufeConOrdenes([{"dps": DPS}], error)
        dispositivos.append(e)
        return e

    from agent.collector.lector import LectorEnchufe

    return LectorEnchufe({"id": "id1", "key": "k", "ip": "10.0.0.5", "name": "Ventilador", "version": "3.5"}, fabrica=fabrica), dispositivos


def test_poner_estado_apaga_y_enciende_el_enchufe():
    lector, dispositivos = lector_con_ordenes()
    lector.poner_estado(False)
    lector.poner_estado(True)
    assert dispositivos[0].ordenes == ["off", "on"]


def test_poner_estado_si_el_enchufe_no_responde_lanza():
    lector, _ = lector_con_ordenes(error={"Error": "Timeout Waiting for Device", "Err": "902"})
    with pytest.raises(ErrorEnchufe, match="Timeout"):
        lector.poner_estado(False)


def test_la_lectura_siguiente_parte_del_estado_nuevo():
    lector, _ = lector_con_ordenes()
    assert lector.leer()["encendido"] is True
    lector.poner_estado(False)
    # el enchufe real devolvería solo lo que cambió; el lector ya conoce el estado nuevo
    assert lector._dps["1"] is False


def test_el_simulador_obedece_las_ordenes_sobre_su_ciclo():
    t = [0.0]
    sim = LectorSimulado("SIM-1", apagar_cada_s=100, apagado_s=20, reloj=lambda: t[0])
    assert sim.leer()["encendido"] is True
    sim.poner_estado(False)
    t[0] = 10  # en pleno tramo "encendido" del ciclo, pero ya lo apagaron
    assert sim.leer()["encendido"] is False
    sim.poner_estado(True)
    t[0] = 110  # en el tramo apagado del ciclo, pero ya lo prendieron
    assert sim.leer()["encendido"] is True


# --- el canal con un servidor WebSocket de verdad -----------------------------------------------------------------------
class LectorFalso:
    def __init__(self, tuya_id="id1", error=None):
        self.tuya_id, self.nombre, self.error, self.estados = tuya_id, "Ventilador", error, []

    def poner_estado(self, encendido):
        if self.error:
            raise ErrorEnchufe(self.error)
        self.estados.append(encendido)


class ServidorFalso:
    """Hace de /ws/agente: recibe el token, saluda, manda `ordenes` y recoge lo que responde el agente."""

    def __init__(self, ordenes, cerrar_con=None, cerrar_tras_orden=False):
        self.ordenes, self.cerrar_con, self.cerrar_tras_orden = ordenes, cerrar_con, cerrar_tras_orden
        self.tokens, self.resultados, self.conexiones = [], [], 0
        self.listo = threading.Event()
        self._srv = serve(self._atender, "127.0.0.1", 0)
        self.url = f"http://127.0.0.1:{self._srv.socket.getsockname()[1]}"
        threading.Thread(target=self._srv.serve_forever, daemon=True).start()

    def _atender(self, ws):
        self.conexiones += 1
        self.tokens.append(json.loads(ws.recv())["token"])
        if self.cerrar_con:
            ws.close(self.cerrar_con)
            return
        ws.send(json.dumps({"tipo": "conectado"}))
        for orden in self.ordenes:
            ws.send(json.dumps({"tipo": "comando", **orden}))
            self.resultados.append(json.loads(ws.recv(timeout=5)))
        self.listo.set()
        if self.cerrar_tras_orden and self.conexiones == 1:
            return  # se corta la conexión: el agente debe reconectar
        try:
            ws.recv(timeout=5)
        except Exception:
            pass

    def cerrar(self):
        self._srv.shutdown()


def agente_contra(servidor, lectores):
    ajustes = Ajustes(servidor.url, "TOKEN-DEL-AGENTE", 5.0, Path("x"), Path("y"))
    parar = threading.Event()
    hilo = threading.Thread(target=ClienteComandos(ajustes, lectores).correr, args=(parar,), daemon=True)
    hilo.start()
    return parar, hilo


def terminar(parar, hilo, servidor):
    parar.set()
    hilo.join(10)
    servidor.cerrar()


def test_recibe_la_orden_la_ejecuta_y_responde():
    servidor = ServidorFalso([{"id": "c1", "tuya_id": "id1", "accion": "apagar"}, {"id": "c2", "tuya_id": "id1", "accion": "encender"}])
    lector = LectorFalso()
    parar, hilo = agente_contra(servidor, [lector])
    assert servidor.listo.wait(10)
    terminar(parar, hilo, servidor)
    assert servidor.tokens[0] == "TOKEN-DEL-AGENTE"
    assert lector.estados == [False, True]
    assert servidor.resultados == [{"tipo": "resultado", "id": "c1", "ok": True, "error": None}, {"tipo": "resultado", "id": "c2", "ok": True, "error": None}]


def test_si_el_enchufe_falla_responde_con_el_motivo():
    servidor = ServidorFalso([{"id": "c1", "tuya_id": "id1", "accion": "apagar"}])
    parar, hilo = agente_contra(servidor, [LectorFalso(error="Timeout Waiting for Device")])
    assert servidor.listo.wait(10)
    terminar(parar, hilo, servidor)
    r = servidor.resultados[0]
    assert r["ok"] is False and "Timeout Waiting for Device" in r["error"]


def test_orden_para_un_enchufe_ajeno_o_accion_rara_se_rechaza():
    servidor = ServidorFalso([{"id": "c1", "tuya_id": "otro", "accion": "apagar"}, {"id": "c2", "tuya_id": "id1", "accion": "explotar"}])
    lector = LectorFalso()
    parar, hilo = agente_contra(servidor, [lector])
    assert servidor.listo.wait(10)
    terminar(parar, hilo, servidor)
    assert [r["ok"] for r in servidor.resultados] == [False, False]
    assert "no es de este agente" in servidor.resultados[0]["error"] and "explotar" in servidor.resultados[1]["error"]
    assert lector.estados == []  # no tocó nada


def test_token_rechazado_se_distingue_de_una_caida():
    servidor = ServidorFalso([], cerrar_con=4401)
    ajustes = Ajustes(servidor.url, "TOKEN-MALO", 5.0, Path("x"), Path("y"))
    try:
        with pytest.raises(TokenRechazado):
            ClienteComandos(ajustes, [])._sesion(threading.Event())
    finally:
        servidor.cerrar()


def test_si_se_corta_la_conexion_reconecta_sola():
    servidor = ServidorFalso([{"id": "c1", "tuya_id": "id1", "accion": "apagar"}], cerrar_tras_orden=True)
    parar, hilo = agente_contra(servidor, [LectorFalso()])
    limite = time.monotonic() + 15
    while servidor.conexiones < 2 and time.monotonic() < limite:
        time.sleep(0.1)
    terminar(parar, hilo, servidor)
    assert servidor.conexiones >= 2  # volvió a conectarse sin intervención
