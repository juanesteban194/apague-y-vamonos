# services/api

Backend FastAPI (Python 3.12): módulos de dominio, migraciones Alembic, seeds y pruebas.
Ver las secciones **Backend**, **Modelo de datos** y **Seguridad** de [CLAUDE.md](../../CLAUDE.md).
Cada módulo: `router.py`, `schemas.py`, `models.py`, `service.py`.

## Desarrollo local

```
docker compose -f ../../infra/local/docker-compose.yml up -d   # PostgreSQL
python3.12 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload                         # http://localhost:8000/docs
.venv/bin/pytest                                                # usa la base <nombre>_test
```

Variables en `.env` (raíz del repo o aquí): `DATABASE_URL`, `JWT_SECRET` (≥ 32 caracteres).

## Despliegue
API en Render (Oregon, plan gratuito): https://gestion-consumo-api.onrender.com (`/salud`, `/docs`).
Base en Neon. Tras 15 min sin tráfico se apaga: despertarla 2 min antes de la demo.
Blueprint en [render.yaml](../../render.yaml) (raíz del repo: Render lo busca ahí).

## Estado
Implementado: `auth` (registro con consentimiento, login, renovar), `hogares`, `dispositivos`, `ingesta`
(`POST /ingesta/lecturas`, idempotente) y los modelos de las 17 tablas.
Prueba de la fase: el agente envió lecturas reales del enchufe a la API en Render y quedaron en Neon
(12 lecturas, intervalo máximo 5,5 s).
Fase 2: `tarifas` (seed EPM sep-2026 en `seeds/tarifas.py`), energía y costo en COP
(`GET /hogares/{id}/resumen`, `GET /dispositivos/{id}/consumo?periodo=dia|semana|mes`, `GET /hogares/{id}/tarifa`) y
WebSocket `/ws/hogares/{id}` (eventos `lectura` y `estado_enchufe`). Retraso medido enchufe → app: máx 0,44 s.
Decisiones de cálculo en [ADR 0003](../../docs/decisiones/0003-calculo-de-energia-y-costo.md).
Pendiente de fases siguientes: alertas, control encender/apagar, prepago, rutinas, RETIQ, equivalencias.
Datos pendientes: tarifa EPM por estrato y mes (tabla `tarifas` vacía), tabla RETIQ, equivalencias.
