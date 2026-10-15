"""«Apague y vámonos» para Mac: un ícono en la barra de menús que corre el agente en segundo plano.

Primera vez: una ventana pide el código de 6 números de la app y listo. Después se abre solo cuando el Mac inicia sesión.
La persona no instala Python ni toca archivos: todo esto va empaquetado en un único .app (ver instalador/)."""
import logging
import logging.handlers
import os
import subprocess
import sys
import threading
from pathlib import Path

import httpx
import rumps

from agent.config import almacen
from agent.config.ajustes import cargar_ajustes
from agent.config.remota import Registro
from agent.principal import Agente
from agent.ui import mac
from agent.vinculacion import API_POR_DEFECTO, vincular

log = logging.getLogger("agente.app")

ACTUALIZAR_CADA_S = 5


def carpeta_de_registros() -> Path:
    return Path.home() / "Library" / "Logs" / "ApagueYVamonos"


def preparar_registro() -> Path:
    carpeta = carpeta_de_registros()
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta = carpeta / "agente.log"
    manejador = logging.handlers.RotatingFileHandler(ruta, maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    manejador.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s", "%Y-%m-%d %H:%M:%S"))
    logging.basicConfig(level=logging.INFO, handlers=[manejador], force=True)
    return ruta


def texto_de_estado(estado: dict) -> str:
    """Lo que dice el menú. Sin tecnicismos: la persona solo necesita saber si todo va bien y qué hacer si no."""
    if estado["token_rechazado"]:
        return "⚠️ El servidor no reconoce este Mac: usa «Vincular de nuevo»"
    if not estado["conectado"]:
        return "🟡 Sin conexión con el servidor (reintentando)"
    n = estado["enchufes"]
    if n == 0:
        return "🟢 Conectado · sin enchufes asignados: elígelos en la app"
    return f"🟢 Conectado · leyendo {n} {'enchufe' if n == 1 else 'enchufes'}"


class AplicacionMac(rumps.App):
    def __init__(self, credenciales: almacen.Credenciales, ruta_registro: Path):
        super().__init__("⚡", quit_button=None)
        self._credenciales = credenciales
        self._ruta_registro = ruta_registro
        self._parar = threading.Event()
        self._agente: Agente | None = None
        self._estado = rumps.MenuItem("Iniciando…")
        self._inicio = rumps.MenuItem("Abrir al iniciar el Mac", callback=self._cambiar_inicio)
        self._inicio.state = mac.inicio_con_el_mac_activo()
        self.menu = [
            self._estado,
            rumps.MenuItem(f"Casa: {credenciales.hogar_nombre or '—'} · Agente: {credenciales.nombre}"),
            None,
            self._inicio,
            rumps.MenuItem("Ver el registro", callback=self._ver_registro),
            rumps.MenuItem("Vincular de nuevo…", callback=self._vincular_de_nuevo),
            None,
            rumps.MenuItem("Salir", callback=self._salir),
        ]
        self._arrancar_agente()
        self._reloj = rumps.Timer(self._refrescar, ACTUALIZAR_CADA_S)
        self._reloj.start()
        self._refrescar(None)

    def _arrancar_agente(self) -> None:
        ajustes = cargar_ajustes(credenciales=self._credenciales)
        cliente = httpx.Client(base_url=ajustes.api_url, headers={"Authorization": f"Bearer {ajustes.token}"}, timeout=httpx.Timeout(20.0, connect=10.0))
        self._agente = Agente(ajustes, Registro(), cliente, remoto=True)
        log.info("Agente «%s» (casa %s) iniciado desde el programa de Mac", self._credenciales.nombre, self._credenciales.hogar_nombre)

        def correr() -> None:
            try:
                self._agente.correr(self._parar)
            except Exception:
                log.exception("El agente se detuvo por un error inesperado")
            finally:
                cliente.close()

        threading.Thread(target=correr, name="agente", daemon=True).start()

    def _refrescar(self, _) -> None:
        if self._agente is not None:
            self._estado.title = texto_de_estado(self._agente.estado())

    def _cambiar_inicio(self, item) -> None:
        if mac.inicio_con_el_mac_activo():
            mac.desactivar_inicio_con_el_mac()
        else:
            mac.activar_inicio_con_el_mac()
        item.state = mac.inicio_con_el_mac_activo()

    def _ver_registro(self, _) -> None:
        subprocess.run(["open", str(self._ruta_registro)], check=False)

    def _vincular_de_nuevo(self, _) -> None:
        nuevas = mac.asistente_de_vinculacion(lambda m: mac.pedir_texto(m), lambda c: vincular(c, self._credenciales.api_url))
        if nuevas is not None:
            mac.avisar(f"Listo: este Mac quedó vinculado como «{nuevas.nombre}». El programa se reinicia.")
            self._parar.set()
            os.execv(sys.executable, [sys.executable, *sys.argv[1:]])

    def _salir(self, _) -> None:
        self._parar.set()
        rumps.quit_application()


def main() -> None:
    ruta_registro = preparar_registro()
    candado = mac.tomar_candado(almacen.carpeta_de_datos() / "agente.lock")
    if candado is None:
        mac.avisar("«Apague y vámonos» ya está funcionando. Búscalo en la barra de menús, arriba (⚡).")
        return
    # Que el Mac no se duerma por inactividad mientras el programa corre: dormido no lee los enchufes (la pantalla sí puede apagarse).
    subprocess.Popen(["caffeinate", "-i", "-w", str(os.getpid())])

    credenciales = almacen.cargar()
    if credenciales is None:
        credenciales = mac.asistente_de_vinculacion(lambda m: mac.pedir_texto(m), lambda c: vincular(c, os.environ.get("AGENT_API_URL") or API_POR_DEFECTO))
        if credenciales is None:
            return  # la persona canceló: nada queda a medias
        mac.activar_inicio_con_el_mac()
        mac.avisar(
            f"¡Listo! Este Mac quedó vinculado como «{credenciales.nombre}» (casa {credenciales.hogar_nombre}).\n\n"
            "Verás un ⚡ en la barra de menús, arriba. El programa se abrirá solo cada vez que inicies sesión; "
            "lo puedes quitar desde ese menú.\n\nAhora, en la app, elige qué enchufes lee este agente."
        )
    AplicacionMac(credenciales, ruta_registro).run()
    del candado
