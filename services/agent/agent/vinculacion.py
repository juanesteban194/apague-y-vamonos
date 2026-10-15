"""Vincular este equipo con un agente creado en la app, usando el código de 6 dígitos (sin tocar archivos ni variables)."""
import httpx

from agent.config import almacen

API_POR_DEFECTO = "https://gestion-consumo-api.onrender.com"


class ErrorVinculacion(Exception):
    """El mensaje está pensado para mostrárselo a la persona tal cual."""


def vincular(codigo: str, api_url: str = API_POR_DEFECTO, cliente: httpx.Client | None = None, ruta=None) -> almacen.Credenciales:
    codigo = "".join(c for c in codigo if c.isdigit())
    if len(codigo) != 6:
        raise ErrorVinculacion("El código tiene 6 números. Míralo en la app: Explorar › Agentes.")
    propio = cliente is None
    cliente = cliente or httpx.Client(timeout=httpx.Timeout(60.0, connect=15.0))  # la API gratuita puede tardar ~1 min en despertar
    try:
        r = cliente.post(f"{api_url.rstrip('/')}/agentes/vincular", json={"codigo": codigo})
    except httpx.HTTPError:
        raise ErrorVinculacion("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.") from None
    finally:
        if propio:
            cliente.close()
    if r.status_code == 404:
        raise ErrorVinculacion("Ese código no es válido o ya venció. Genera uno nuevo en la app.")
    if r.status_code == 429:
        raise ErrorVinculacion("Demasiados intentos. Espera un minuto e intenta de nuevo.")
    if r.status_code != 200:
        raise ErrorVinculacion(f"El servidor respondió con un error ({r.status_code}). Intenta más tarde.")
    d = r.json()
    credenciales = almacen.Credenciales(api_url=api_url.rstrip("/"), token=d["token"], agente_id=d["agente_id"], nombre=d["nombre"], hogar_nombre=d["hogar_nombre"])
    almacen.guardar(credenciales, ruta)
    return credenciales
