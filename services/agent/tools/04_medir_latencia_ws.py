"""Fase 2 (prueba): mide el retraso entre que el agente lee el enchufe y la app recibe el evento `lectura` por WebSocket.

Criterio (CLAUDE.md): ≤ 5 s. Hace de agente (usa el lector del agente y envía a la API) y de app (login + WebSocket) a la vez,
en la misma máquina, así que no hay desfase de relojes. Requiere AGENT_API_URL, AGENT_TOKEN (en .env) y
DEMO_EMAIL, DEMO_PASSWORD, DEMO_HOGAR_ID (en .env.demo).

Uso:
    .venv/bin/python tools/04_medir_latencia_ws.py --lecturas 30
"""
import argparse
import asyncio
import json
import os
import statistics
import sys
import time
from datetime import UTC, datetime

import httpx
import websockets
from agent.collector.lector import ErrorEnchufe, LectorEnchufe
from agent.config.ajustes import cargar_env


async def main() -> None:
    cargar_env()
    cargar_env(".env.demo")
    p = argparse.ArgumentParser()
    p.add_argument("--devices", default="devices.json")
    p.add_argument("--lecturas", type=int, default=30)
    args = p.parse_args()

    faltan = [v for v in ("AGENT_API_URL", "AGENT_TOKEN", "DEMO_EMAIL", "DEMO_PASSWORD", "DEMO_HOGAR_ID") if not os.environ.get(v)]
    if faltan:
        sys.exit(f"Faltan variables: {', '.join(faltan)}")
    api = os.environ["AGENT_API_URL"].rstrip("/")
    segundos = float(os.environ.get("AGENT_POLL_SECONDS") or 5)
    d = json.load(open(args.devices))[0]
    lector = LectorEnchufe(d)
    bucle = asyncio.get_running_loop()
    retrasos: list[float] = []

    async with httpx.AsyncClient(base_url=api, timeout=30) as http:
        await http.get("/salud")  # despierta Render si estaba dormido (no cuenta en la medición)
        r = await http.post("/auth/login", json={"email": os.environ["DEMO_EMAIL"], "contrasena": os.environ["DEMO_PASSWORD"]})
        r.raise_for_status()
        token = r.json()["access_token"]
        url_ws = api.replace("https://", "wss://").replace("http://", "ws://") + f"/ws/hogares/{os.environ['DEMO_HOGAR_ID']}"

        async with websockets.connect(url_ws) as ws:
            await ws.send(json.dumps({"token": token}))
            print("WebSocket:", json.loads(await ws.recv()))

            async def escuchar() -> None:
                async for mensaje in ws:
                    ev = json.loads(mensaje)
                    if ev.get("tipo") != "lectura":
                        print("evento:", ev["tipo"])
                        continue
                    retraso = (datetime.now(UTC) - datetime.fromisoformat(ev["fecha_hora"])).total_seconds()
                    retrasos.append(retraso)
                    print(f"[{len(retrasos)}/{args.lecturas}] {ev['potencia_w']} W  retraso {retraso:.2f} s")

            oyente = asyncio.create_task(escuchar())
            for _ in range(args.lecturas):
                t0 = time.time()
                try:
                    lectura = await bucle.run_in_executor(None, lector.leer)
                except ErrorEnchufe as e:
                    print("enchufe sin respuesta:", e)
                    lectura = None
                if lectura is None:
                    await asyncio.sleep(max(0, segundos - (time.time() - t0)))
                    continue
                resp = await http.post(
                    "/ingesta/lecturas", json={"lecturas": [lectura]}, headers={"Authorization": f"Bearer {os.environ['AGENT_TOKEN']}"}
                )
                resp.raise_for_status()
                await asyncio.sleep(max(0, segundos - (time.time() - t0)))
            await asyncio.sleep(3)  # deja llegar el último evento
            oyente.cancel()

    if not retrasos:
        sys.exit("No llegó ningún evento por WebSocket")
    retrasos.sort()
    p95 = retrasos[min(len(retrasos) - 1, int(len(retrasos) * 0.95))]
    print(f"\nEventos recibidos: {len(retrasos)}/{args.lecturas}")
    print(f"Retraso (lectura del enchufe → evento en la app): mín {retrasos[0]:.2f} s, media {statistics.mean(retrasos):.2f} s, p95 {p95:.2f} s, máx {retrasos[-1]:.2f} s")
    print("CUMPLE (≤ 5 s)" if retrasos[-1] <= 5 else "NO CUMPLE: hay lecturas con retraso > 5 s")


if __name__ == "__main__":
    asyncio.run(main())
