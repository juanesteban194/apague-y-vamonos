# services/agent

Agente local que corre en la casa: lee el enchufe BSD04 por LAN con TinyTuya, guarda en cola SQLite sin internet y recibe comandos por WSS.
`devices.json` (con la clave local) está en .gitignore.
Ver **Hardware verificado**, **Vías hacia el enchufe** y **Plan de construcción** en [CLAUDE.md](../../CLAUDE.md).

## Correrlo
```
cd services/agent
python3.12 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/python -m tinytuya wizard      # una vez: genera devices.json (clave local). No repetir sin necesidad: gasta cuota de Tuya Cloud.
# en el .env de la raíz: AGENT_API_URL, AGENT_TOKEN (de POST /hogares/{id}/agentes), AGENT_POLL_SECONDS
.venv/bin/python -m agent
.venv/bin/pytest
```

## Cómo funciona
Dos hilos independientes: **lectura** (cada `AGENT_POLL_SECONDS`, horario fijo) y **envío**. Una API lenta o sin internet nunca retrasa la lectura.
- `agent/collector`: `LectorEnchufe` detecta el protocolo (3.5 para el BSD04), conserva el último valor de cada DP (el enchufe manda
  solo los que cambian), reconecta y, tras 3 fallos, busca el enchufe por la red por si el router le cambió la IP.
  Escalas confirmadas en el [ADR 0001](../../docs/decisiones/0001-escalas-data-points-bsd04.md).
- `agent/buffer`: cola SQLite (`cola.sqlite`, modo WAL). Las lecturas se borran solo cuando la API confirma su recepción.
  Límite de 200.000 filas (≈ 7 días de un enchufe); si se llena se descartan las más viejas. Sobrevive a reinicios.
- `agent/enviador.py`: envía en orden, en lotes de 500. Sin red o con error del servidor: conserva todo y reintenta (espera creciente
  hasta 10 s). 401: conserva todo y avisa. 422: prueba las lecturas una por una para que una mala no atasque la cola.
- La API es idempotente: reenviar una lectura no la duplica.
- `agent/commands`: encender/apagar por WSS (Fase 4).

## Herramientas de verificación (`tools/`)
`01_escanear_red.py` (Fase 0) · `02_leer_local.py` (Fase 0, 10 min de lecturas) · `04_medir_latencia_ws.py` (Fase 2, enchufe → app).

## Verificado
23 pruebas (cola, lector, enviador, agente completo con caída de internet). Con el enchufe real y una API apagada ~35 s:
21 lecturas en 100 s, intervalo máximo 5,0 s, 0 duplicados, cola vacía al final.
