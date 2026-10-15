"""Credenciales del agente guardadas en el equipo tras vincularlo con el código de la app (ADR 0008).

Quedan en una carpeta del usuario (no en el proyecto) con permisos solo para él: es el token del agente."""
import json
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

NOMBRE_CARPETA = "ApagueYVamonos"


@dataclass(frozen=True)
class Credenciales:
    api_url: str
    token: str
    agente_id: str
    nombre: str
    hogar_nombre: str = ""


def carpeta_de_datos() -> Path:
    """Dónde guarda cada sistema los datos de una app: Application Support (Mac), AppData (Windows) o ~/.config (Linux)."""
    if sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    elif sys.platform == "win32":
        base = Path(os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming")
    else:
        base = Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config")
    return Path(os.environ.get("AGENT_DATA_DIR") or base / NOMBRE_CARPETA)


def ruta_credenciales() -> Path:
    return carpeta_de_datos() / "agente.json"


def guardar(c: Credenciales, ruta: Path | None = None) -> Path:
    ruta = ruta or ruta_credenciales()
    ruta.parent.mkdir(parents=True, exist_ok=True)
    temporal = ruta.with_suffix(".tmp")
    # Se crea con permisos 600 desde el principio: el token nunca queda legible para otros usuarios del equipo.
    descriptor = os.open(temporal, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as f:
        json.dump(asdict(c), f)
    os.replace(temporal, ruta)
    return ruta


def cargar(ruta: Path | None = None) -> Credenciales | None:
    ruta = ruta or ruta_credenciales()
    try:
        datos = json.loads(ruta.read_text())
        return Credenciales(**{k: datos[k] for k in ("api_url", "token", "agente_id", "nombre")}, hogar_nombre=datos.get("hogar_nombre", ""))
    except (FileNotFoundError, ValueError, KeyError, TypeError):
        return None


def borrar(ruta: Path | None = None) -> None:
    (ruta or ruta_credenciales()).unlink(missing_ok=True)
