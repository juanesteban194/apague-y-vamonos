"""Fase 0, paso 2: lee el enchufe por LAN cada N segundos y guarda un CSV con los DP crudos.

No aplica escalas: imprime los valores tal como llegan para compararlos con Smart Life.
Requiere devices.json (generado por `python -m tinytuya wizard`) en el directorio actual.

Uso:
    .venv/bin/python tools/02_leer_local.py                 # 10 min, cada 5 s
    .venv/bin/python tools/02_leer_local.py --minutos 1 --nombre BSD04
"""
import argparse
import csv
import json
import statistics
import sys
import time
from datetime import datetime

import tinytuya

DPS_ELECTRICOS = ["17", "18", "19", "20"]  # energía, corriente, potencia, voltaje (por confirmar)


def cargar_dispositivo(ruta: str, nombre: str | None) -> dict:
    with open(ruta) as f:
        dispositivos = json.load(f)
    if nombre:
        dispositivos = [d for d in dispositivos if nombre.lower() in d.get("name", "").lower()]
    if not dispositivos:
        sys.exit("No hay dispositivos en devices.json (¿nombre correcto?)")
    d = dispositivos[0]
    if not d.get("ip"):
        sys.exit("El dispositivo no tiene IP en devices.json. Corre tools/01_escanear_red.py y repite el asistente.")
    return d


def conectar(d: dict, version: float | None) -> tinytuya.OutletDevice:
    """Usa la versión dada o la de devices.json; si no hay, prueba las conocidas."""
    candidatas = [version or d.get("ver")] if (version or d.get("ver")) else [3.5, 3.4, 3.3, 3.2, 3.1]
    for v in candidatas:
        dev = tinytuya.OutletDevice(d["id"], d["ip"], d["key"])
        dev.set_version(float(v))
        dev.set_socketTimeout(4)
        if dev.status().get("dps"):
            print(f"Protocolo {v} OK")
            dev.set_socketPersistent(True)
            return dev
    sys.exit("Ninguna versión de protocolo respondió (¿clave local cambiada o IP distinta?)")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--devices", default="devices.json")
    p.add_argument("--nombre")
    p.add_argument("--version", type=float, help="Protocolo (3.3, 3.4, 3.5); por defecto se detecta")
    p.add_argument("--segundos", type=float, default=5)
    p.add_argument("--minutos", type=float, default=10)
    args = p.parse_args()

    d = cargar_dispositivo(args.devices, args.nombre)
    print(f"Dispositivo: {d.get('name')}  ip={d['ip']}  versión={d.get('ver') or 'sin definir'}")
    dev = conectar(d, args.version)

    salida = f"lecturas_fase0_{datetime.now():%Y%m%d_%H%M%S}.csv"
    total = int(args.minutos * 60 / args.segundos)
    ok, fallos, marcas = 0, 0, []
    valores = {k: [] for k in DPS_ELECTRICOS}
    ultimo: dict = {}  # el enchufe devuelve solo los DP que cambiaron: se arrastra el último valor

    with open(salida, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["hora", "dps_json"])
        for i in range(total):
            t0 = time.time()
            r = dev.status()
            dps = r.get("dps") if isinstance(r, dict) else None
            if not dps:
                fallos += 1
                print(f"[{i+1}/{total}] FALLO: {r}")
            else:
                ok += 1
                marcas.append(t0)
                ultimo.update(dps)
                w.writerow([datetime.fromtimestamp(t0).isoformat(), json.dumps(ultimo)])
                f.flush()
                for k in DPS_ELECTRICOS:
                    if isinstance(ultimo.get(k), (int, float)):
                        valores[k].append(ultimo[k])
                print(f"[{i+1}/{total}] {datetime.fromtimestamp(t0):%H:%M:%S}  {dps}")
            time.sleep(max(0, args.segundos - (time.time() - t0)))

    print(f"\nResumen: {ok} lecturas ok, {fallos} fallos. CSV: {salida}")
    if len(marcas) > 1:
        huecos = [b - a for a, b in zip(marcas, marcas[1:])]
        print(f"Intervalo máx entre lecturas: {max(huecos):.1f} s (huecos > 60 s: {sum(h > 60 for h in huecos)})")
    for k, v in valores.items():
        if v:
            print(f"DP {k} crudo: min={min(v)} max={max(v)} media={statistics.mean(v):.1f} desv={statistics.pstdev(v):.2f}")
    print("Compara estos crudos con Smart Life para fijar las escalas (no se asumen).")


if __name__ == "__main__":
    main()
