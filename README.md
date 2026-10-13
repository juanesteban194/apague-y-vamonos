# Apague y vámonos — Gestión de consumo energético (Reto 2)

App móvil que mide el consumo de electrodomésticos con enchufes inteligentes Tuya, lo traduce a pesos (tarifa EPM) y a equivalencias
cotidianas, avisa consumos anómalos y recomienda acciones. Proyecto de Ingeniería 1, Universidad de Medellín.
Contexto, decisiones y plan completos en [CLAUDE.md](CLAUDE.md).

```
Enchufe BSD04 ──LAN──▶ Agente local ──HTTPS──▶ API FastAPI (Render) ──WSS/REST──▶ App Expo (Android e iPhone)
                       (cola SQLite)                    │
                                                  PostgreSQL (Neon)
```
La app nunca habla con Tuya: todo pasa por la API.

## Qué hay
| Carpeta | Contenido | Cómo correrlo |
| --- | --- | --- |
| [services/api](services/api) | Backend FastAPI: auth, hogares, ingesta, consumo, tarifas, WebSocket | [README](services/api/README.md) |
| [services/agent](services/agent) | Agente local: lee el enchufe, guarda sin internet, envía a la API | [README](services/agent/README.md) |
| [apps/mobile](apps/mobile) | App Expo SDK 57 (Inicio, Explorar, Avisos, Ajustes) | [README](apps/mobile/README.md) |
| [docs](docs) | ADR (decisiones) e historias de usuario | [HU](docs/historias-usuario/README.md) |
| [infra](infra) · [render.yaml](render.yaml) | PostgreSQL local con Docker y blueprint de Render | — |

## Estado
Fases 0, 1 y 2 hechas y medidas (retraso enchufe → app máx 0,44 s; sin huecos aun con la API caída). Fase 3 construida: falta la prueba en
teléfonos. Siguiente: Fase 4 (alertas, control, rutinas). Detalle en [CLAUDE.md](CLAUDE.md#tarea-actual--cierre-de-la-fase-3-y-arranque-de-la-fase-4).

API en producción: https://gestion-consumo-api.onrender.com (`/docs`). Gratuita: se duerme tras 15 min sin tráfico; despertarla 2 min antes de la demo.

## Secretos
Nunca en el repositorio: `.env*`, `devices.json` (clave local del enchufe) y `tinytuya.json` están en `.gitignore`. Variables en [.env.example](.env.example).
