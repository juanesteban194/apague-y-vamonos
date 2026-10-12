"""Fase 1 (prueba): lee el enchufe por LAN cada AGENT_POLL_SECONDS y envía las lecturas a la API.

No es el agente final (sin cola SQLite ni comandos): solo comprueba que las lecturas llegan a la base.
Variables (en .env de la raíz o del entorno): AGENT_API_URL, AGENT_TOKEN, AGENT_POLL_SECONDS.
Escalas confirmadas en docs/decisiones/0001: DP18 = mA, DP19 = 0,1 W, DP20 = 0,1 V, DP1 = encendido.

Uso:
    .venv/bin/python tools/03_enviar_lecturas.py --minutos 2
"""
import argparse
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx
import tinytuya

PROTOCOLOS = [3.5, 3.4, 3.3]  # el BSD04 responde con 3.5


def cargar_env() -> None:
    for ruta in (Path(".env"), Path("../../.env")):
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


def main() -> None:
    cargar_env()
    p = argparse.ArgumentParser()
    p.add_argument("--devices", default="devices.json")
    p.add_argument("--minutos", type=float, default=2)
    args = p.parse_args()

    api, token = os.environ.get("AGENT_API_URL"), os.environ.get("AGENT_TOKEN")
    if not api or not token:
        sys.exit("Faltan AGENT_API_URL y AGENT_TOKEN")
    segundos = float(os.environ.get("AGENT_POLL_SECONDS") or 5)

    d = json.load(open(args.devices))[0]
    dev = conectar(d)
    dps: dict = {}
    pendientes: list[dict] = []  # se reintentan si la API no responde (cola en memoria, solo para la prueba)

    with httpx.Client(base_url=api.rstrip("/"), headers={"Authorization": f"Bearer {token}"}, timeout=20) as http:
        for i in range(int(args.minutos * 60 / segundos)):
            t0 = time.time()
            dps.update(dev.status().get("dps") or {})
            if {"1", "18", "19", "20"} <= dps.keys():
                pendientes.append(
                    {
                        "tuya_id": d["id"],
                        "fecha_hora": datetime.now(UTC).isoformat(),
                        "potencia_w": dps["19"] / 10,
                        "voltaje_v": dps["20"] / 10,
                        "corriente_ma": dps["18"],
                        "encendido": bool(dps["1"]),
                    }
                )
            try:
                r = http.post("/ingesta/lecturas", json={"lecturas": pendientes[:1000]})
                r.raise_for_status()
                print(f"[{i+1}] {pendientes[-1]['potencia_w']} W -> {r.json()}")
                pendientes = pendientes[1000:]
            except httpx.HTTPError as e:
                print(f"[{i+1}] sin enviar ({len(pendientes)} en espera): {e}")
            time.sleep(max(0, segundos - (time.time() - t0)))


if __name__ == "__main__":
    main()
