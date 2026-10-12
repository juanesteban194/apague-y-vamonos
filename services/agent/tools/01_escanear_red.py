"""Fase 0, paso 1: busca por la red local los dispositivos Tuya y muestra IP y versión de protocolo.

Uso (Mac y enchufe en la misma red WiFi de 2,4 GHz):
    .venv/bin/python tools/01_escanear_red.py
"""
import tinytuya

if __name__ == "__main__":
    tinytuya.scan(maxretry=20)
