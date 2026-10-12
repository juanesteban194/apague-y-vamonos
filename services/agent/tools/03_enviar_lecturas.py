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

import httpx
from _comun import cargar_env, conectar, lectura_desde_dps

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
                pendientes.append(lectura_desde_dps(d["id"], dps, datetime.now(UTC).isoformat()))
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
