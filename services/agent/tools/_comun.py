"""Piezas compartidas por las herramientas de verificación (03, 04)."""
import os
import sys
from pathlib import Path

import tinytuya

PROTOCOLOS = [3.5, 3.4, 3.3]  # el BSD04 responde con 3.5


def cargar_env(*nombres: str) -> None:
    """Carga variables de .env (aquí o en la raíz del repo) sin pisar las del entorno."""
    for nombre in nombres or (".env",):
        for ruta in (Path(nombre), Path("../..") / nombre):
            if ruta.is_file():
                for linea in ruta.read_text().splitlines():
                    clave, sep, valor = linea.partition("=")
                    if sep and not linea.lstrip().startswith("#"):
                        os.environ.setdefault(clave.strip(), valor.strip())


def conectar(d: dict) -> tinytuya.OutletDevice:
    for v in [d.get("ver")] if d.get("ver") else PROTOCOLOS:
        dev = tinytuya.OutletDevice(d["id"], d["ip"], d["key"])
        dev.set_version(float(v))
        dev.set_socketTimeout(4)
        if dev.status().get("dps"):
            dev.set_socketPersistent(True)
            return dev
    sys.exit("El enchufe no responde por LAN (¿IP o clave cambiaron?)")


def lectura_desde_dps(tuya_id: str, dps: dict, fecha_hora: str) -> dict:
    """Aplica las escalas confirmadas (ADR 0001): DP18 = mA, DP19 = 0,1 W, DP20 = 0,1 V, DP1 = encendido."""
    return {
        "tuya_id": tuya_id,
        "fecha_hora": fecha_hora,
        "potencia_w": dps["19"] / 10,
        "voltaje_v": dps["20"] / 10,
        "corriente_ma": dps["18"],
        "encendido": bool(dps["1"]),
    }
