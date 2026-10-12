"""Configuración del agente: variables de entorno (o .env) y devices.json (con la clave local, gitignored)."""
import json
import os
from dataclasses import dataclass
from pathlib import Path


class ErrorConfiguracion(Exception):
    pass


@dataclass(frozen=True)
class Ajustes:
    api_url: str
    token: str
    segundos: float
    ruta_devices: Path
    ruta_cola: Path


def cargar_env(nombre: str = ".env") -> None:
    """Lee .env del directorio actual o de la raíz del repo, sin pisar variables ya definidas."""
    for ruta in (Path(nombre), Path("../..") / nombre):
        if ruta.is_file():
            for linea in ruta.read_text().splitlines():
                clave, sep, valor = linea.partition("=")
                if sep and not linea.lstrip().startswith("#"):
                    os.environ.setdefault(clave.strip(), valor.strip())


def cargar_ajustes(entorno: dict[str, str] | None = None) -> Ajustes:
    entorno = os.environ if entorno is None else entorno
    faltan = [v for v in ("AGENT_API_URL", "AGENT_TOKEN") if not entorno.get(v)]
    if faltan:
        raise ErrorConfiguracion(f"Faltan variables de entorno: {', '.join(faltan)}")
    try:
        segundos = float(entorno.get("AGENT_POLL_SECONDS") or 5)
    except ValueError:
        raise ErrorConfiguracion("AGENT_POLL_SECONDS debe ser un número") from None
    if segundos <= 0:
        raise ErrorConfiguracion("AGENT_POLL_SECONDS debe ser mayor que 0")
    return Ajustes(
        api_url=entorno["AGENT_API_URL"].rstrip("/"),
        token=entorno["AGENT_TOKEN"],
        segundos=segundos,
        ruta_devices=Path(entorno.get("AGENT_DEVICES_FILE") or "devices.json"),
        ruta_cola=Path(entorno.get("AGENT_QUEUE_FILE") or "cola.sqlite"),
    )


def cargar_dispositivos(ruta: Path) -> list[dict]:
    """Dispositivos de devices.json (formato del asistente de TinyTuya). Exige id, key e ip."""
    try:
        dispositivos = json.loads(ruta.read_text())
    except FileNotFoundError:
        raise ErrorConfiguracion(f"No existe {ruta}: genéralo con `python -m tinytuya wizard`") from None
    except json.JSONDecodeError as e:
        raise ErrorConfiguracion(f"{ruta} no es JSON válido: {e}") from None
    if not isinstance(dispositivos, list) or not dispositivos:
        raise ErrorConfiguracion(f"{ruta} no tiene dispositivos")
    for d in dispositivos:
        faltan = [k for k in ("id", "key") if not d.get(k)]
        if faltan:
            raise ErrorConfiguracion(f"Un dispositivo de {ruta} no tiene {', '.join(faltan)}")
    return dispositivos
