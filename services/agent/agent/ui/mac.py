"""Piezas del programa de Mac que no dependen de la ventana en sí (por eso se pueden probar): diálogos nativos, inicio con el Mac,
una sola instancia y el asistente de vinculación.

Los diálogos usan osascript (viene con macOS): la persona ve ventanas normales del sistema y no hay que instalar nada."""
import fcntl
import os
import plistlib
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

from agent.config import almacen
from agent.vinculacion import ErrorVinculacion

TITULO = "Apague y vámonos"
ETIQUETA_INICIO = "co.apagueyvamonos.agente"
MENSAJE_CODIGO = "Escribe el código de 6 números que ves en la app:\nExplorar › Agentes › Agregar agente"

Correr = Callable[..., subprocess.CompletedProcess]


def _osascript(lineas: list[str], argumentos: list[str], correr: Correr) -> subprocess.CompletedProcess:
    # Los textos viajan como argumentos, no dentro del script: así un nombre con comillas no rompe nada.
    orden = ["osascript"]
    for linea in lineas:
        orden += ["-e", linea]
    return correr(orden + ["--", *argumentos], capture_output=True, text=True)


def pedir_texto(mensaje: str, boton: str = "Vincular", titulo: str = TITULO, correr: Correr = subprocess.run) -> str | None:
    """Ventana con un campo de texto. None si la persona la cancela."""
    r = _osascript(
        [
            "on run argv",
            'set resultado to display dialog (item 1 of argv) with title (item 2 of argv) default answer "" buttons {"Cancelar", (item 3 of argv)} default button (item 3 of argv) cancel button "Cancelar" with icon note',
            "return text returned of resultado",
            "end run",
        ],
        [mensaje, titulo, boton],
        correr,
    )
    return r.stdout.strip() if r.returncode == 0 else None


def avisar(mensaje: str, titulo: str = TITULO, correr: Correr = subprocess.run) -> None:
    _osascript(
        [
            "on run argv",
            'display dialog (item 1 of argv) with title (item 2 of argv) buttons {"Entendido"} default button "Entendido" with icon note',
            "end run",
        ],
        [mensaje, titulo],
        correr,
    )


def asistente_de_vinculacion(
    pedir: Callable[[str], str | None], vincular: Callable[[str], almacen.Credenciales]
) -> almacen.Credenciales | None:
    """Pide el código hasta que sirva o la persona cancele. Los errores se le dicen tal cual y se le deja intentar otra vez."""
    mensaje = MENSAJE_CODIGO
    while True:
        codigo = pedir(mensaje)
        if codigo is None:
            return None
        try:
            return vincular(codigo)
        except ErrorVinculacion as e:
            mensaje = f"{e}\n\nEscribe el código de nuevo:"


# --- inicio con el Mac ------------------------------------------------------------------------------------------------
def carpeta_inicio_automatico() -> Path:
    return Path.home() / "Library" / "LaunchAgents"


def ruta_plist(carpeta: Path | None = None) -> Path:
    return (carpeta or carpeta_inicio_automatico()) / f"{ETIQUETA_INICIO}.plist"


def inicio_con_el_mac_activo(carpeta: Path | None = None) -> bool:
    return ruta_plist(carpeta).is_file()


def activar_inicio_con_el_mac(ejecutable: str | None = None, carpeta: Path | None = None) -> Path:
    """Escribe el LaunchAgent: el Mac abre el programa solo al entrar a la sesión y lo vuelve a abrir si se cae.
    Si la persona lo cierra desde el menú (salida normal), no lo reabre. Surte efecto en el próximo inicio de sesión."""
    ejecutable = ejecutable or sys.executable
    ruta = ruta_plist(carpeta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_bytes(
        plistlib.dumps(
            {
                "Label": ETIQUETA_INICIO,
                "ProgramArguments": [ejecutable],
                "RunAtLoad": True,
                "KeepAlive": {"SuccessfulExit": False},
                "ProcessType": "Interactive",
            }
        )
    )
    return ruta


def desactivar_inicio_con_el_mac(carpeta: Path | None = None) -> None:
    ruta_plist(carpeta).unlink(missing_ok=True)


# --- una sola instancia -----------------------------------------------------------------------------------------------
def tomar_candado(ruta: Path):
    """Un candado de archivo que el sistema suelta solo si el programa se cierra o se cae. None si ya hay otro programa corriendo."""
    ruta.parent.mkdir(parents=True, exist_ok=True)
    archivo = open(ruta, "w")
    try:
        fcntl.flock(archivo, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        archivo.close()
        return None
    archivo.write(str(os.getpid()))
    archivo.flush()
    return archivo
