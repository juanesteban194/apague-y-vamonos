"""Programa principal: un hilo lee el enchufe cada AGENT_POLL_SECONDS y otro envía la cola a la API.

Están separados para que un servidor lento o sin internet nunca retrase la lectura: sin huecos mayores a 1 minuto."""
import argparse
import logging
import signal
import threading
import time

import httpx

from agent.buffer.cola import Cola
from agent.collector.lector import ErrorEnchufe, LectorEnchufe
from agent.collector.simulador import LectorSimulado
from agent.commands.cliente import ClienteComandos
from agent.config import almacen
from agent.config.ajustes import Ajustes, ErrorConfiguracion, cargar_ajustes, cargar_dispositivos, cargar_env
from agent.config.remota import Registro, bucle as bucle_config
from agent.vinculacion import API_POR_DEFECTO, ErrorVinculacion, vincular
from agent.enviador import Enviador, ErrorAutenticacion, ErrorRed

log = logging.getLogger("agente")

AVISAR_CADA_S = 30  # un enchufe o la red caídos no deben llenar el registro cada 5 s
ESPERA_MAXIMA_REINTENTO_S = 10  # con la API caída se reintenta cada ≤ 10 s: al volver, lo acumulado sale casi de inmediato


class Agente:
    def __init__(self, ajustes: Ajustes, lectores: "list | Registro", cliente: httpx.Client, remoto: bool = False):
        self._ajustes = ajustes
        self._registro = lectores if isinstance(lectores, Registro) else Registro(lectores)
        self._remoto = remoto  # pide su lista de enchufes a la API cada minuto
        self._comandos = ClienteComandos(ajustes, self._registro)
        self._cliente = cliente
        self._hay_datos = threading.Event()
        self._ultimo_aviso: dict[str, float] = {}

    def estado(self) -> dict:
        """Para mostrarlo en la barra de menús: cuántos enchufes lee, si el canal con la API está abierto y si el token fue rechazado."""
        return {"enchufes": len(self._registro.lectores()), "conectado": self._comandos.conectado, "token_rechazado": self._comandos.token_rechazado}

    def correr(self, parar: threading.Event) -> None:
        hilos = [
            threading.Thread(target=self._bucle_lectura, args=(parar,), name="lectura", daemon=True),
            threading.Thread(target=self._bucle_envio, args=(parar,), name="envio", daemon=True),
            threading.Thread(target=self._comandos.correr, args=(parar,), name="comandos", daemon=True),
        ]
        if self._remoto:
            hilos.append(threading.Thread(target=bucle_config, args=(self._cliente, self._registro, parar), name="configuracion", daemon=True))
        for h in hilos:
            h.start()
        parar.wait()
        for h in hilos:
            h.join(timeout=10)

    def _avisar(self, clave: str, nivel: int, mensaje: str, *args) -> None:
        ahora = time.monotonic()
        if ahora - self._ultimo_aviso.get(clave, -AVISAR_CADA_S) >= AVISAR_CADA_S:
            self._ultimo_aviso[clave] = ahora
            log.log(nivel, mensaje, *args)

    def _bucle_lectura(self, parar: threading.Event) -> None:
        cola = Cola(self._ajustes.ruta_cola)
        proximo = time.monotonic()
        try:
            while not parar.is_set():
                for lector in self._registro.lectores():
                    try:
                        lectura = lector.leer()
                    except ErrorEnchufe as e:
                        self._avisar(f"enchufe-{lector.tuya_id}", logging.WARNING, "%s sin respuesta: %s", lector.nombre, e)
                        continue
                    except Exception:
                        log.exception("Error inesperado leyendo %s", lector.nombre)
                        continue
                    if lectura:
                        cola.agregar(lectura)
                        self._hay_datos.set()
                proximo += self._ajustes.segundos  # horario fijo: la lectura lenta de un ciclo no desplaza los siguientes
                espera = proximo - time.monotonic()
                if espera > 0:
                    parar.wait(espera)
                else:
                    proximo = time.monotonic()
        finally:
            cola.cerrar()

    def _bucle_envio(self, parar: threading.Event) -> None:
        cola = Cola(self._ajustes.ruta_cola)
        enviador = Enviador(cola, self._cliente)
        espera = 1.0
        try:
            while not parar.is_set():
                try:
                    enviadas = enviador.enviar_lote()
                except ErrorRed as e:
                    self._avisar("red", logging.WARNING, "Sin conexión con la API (%d lecturas en cola): %s", cola.pendientes(), e)
                    espera = min(ESPERA_MAXIMA_REINTENTO_S, espera * 2)
                    parar.wait(espera)
                    continue
                except ErrorAutenticacion:
                    self._avisar("auth", logging.ERROR, "La API rechaza el token del agente (AGENT_TOKEN). Las lecturas se siguen guardando.")
                    parar.wait(60)
                    continue
                if espera > 1.0:
                    log.info("Conexión con la API recuperada; enviando lo acumulado")
                espera = 1.0
                if enviadas == 0:
                    self._hay_datos.wait(timeout=5)
                    self._hay_datos.clear()
        finally:
            cola.cerrar()


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m agent", description="Agente local de consumo energético")
    parser.add_argument("--vincular", metavar="CODIGO", help="vincula este equipo con el código de 6 dígitos que muestra la app (Explorar › Agentes)")
    parser.add_argument("--api", default=None, help=f"dirección de la API al vincular (por defecto {API_POR_DEFECTO})")
    parser.add_argument("--desvincular", action="store_true", help="olvida la vinculación de este equipo")
    parser.add_argument("--simular", metavar="ID_TUYA", action="append",
                        help="en vez del enchufe real, simula uno con este ID de Tuya (repetible); no usa devices.json")
    parser.add_argument("--vatios", type=float, default=26.5, help="potencia del enchufe simulado (por defecto 26,5 W, un ventilador)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", datefmt="%H:%M:%S")
    if args.desvincular:
        almacen.borrar()
        raise SystemExit("Listo: este equipo ya no está vinculado.")
    if args.vincular:
        try:
            c = vincular(args.vincular, args.api or API_POR_DEFECTO)
        except ErrorVinculacion as e:
            raise SystemExit(str(e)) from None
        raise SystemExit(f"Listo: este equipo quedó vinculado como «{c.nombre}» (casa {c.hogar_nombre}). Ahora corre el agente.")

    cargar_env()
    guardadas = almacen.cargar()
    remoto = guardadas is not None and not args.simular  # vinculado con código: pide sus enchufes a la API
    try:
        ajustes = cargar_ajustes(credenciales=guardadas)
        lectores = (
            [LectorSimulado(i, vatios=args.vatios) for i in args.simular]
            if args.simular
            else Registro() if remoto
            else [LectorEnchufe(d) for d in cargar_dispositivos(ajustes.ruta_devices)]
        )
    except ErrorConfiguracion as e:
        raise SystemExit(f"Configuración: {e}") from None

    cliente = httpx.Client(
        base_url=ajustes.api_url, headers={"Authorization": f"Bearer {ajustes.token}"}, timeout=httpx.Timeout(20.0, connect=10.0)
    )
    if args.simular:
        log.warning("MODO SIMULACIÓN: los datos NO vienen de un enchufe real (%s)", ", ".join(args.simular))
    if remoto:
        log.info("Agente «%s» (casa %s): la lista de enchufes se pide a la API", guardadas.nombre, guardadas.hogar_nombre)
    else:
        log.info("Agente iniciado: %d enchufe(s), lectura cada %s s, API %s", len(lectores), ajustes.segundos, ajustes.api_url)

    parar = threading.Event()
    for senal in (signal.SIGINT, signal.SIGTERM):
        signal.signal(senal, lambda *_: parar.set())
    try:
        Agente(ajustes, lectores, cliente, remoto=remoto).correr(parar)
    finally:
        cliente.close()
        log.info("Agente detenido")
