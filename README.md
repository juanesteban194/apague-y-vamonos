# Apague y vámonos

App móvil para que una familia sepa **cuánto le cuesta en pesos cada dispositivo de su casa** y pague **menos que el promedio de sus facturas de EPM**.
Mide el consumo con enchufes inteligentes (Tuya), lo convierte a pesos con la tarifa de EPM y a equivalencias cotidianas («es como dejar el televisor prendido 21 horas»), avisa cuando algo gasta de más, deja apagar los dispositivos desde el teléfono, programa apagados y recomienda cuándo vale la pena cambiar un electrodoméstico (etiqueta RETIQ).

Proyecto de Ingeniería 1, Universidad de Medellín (Reto 2: gestión del consumo energético doméstico). Alcance: demo funcional para la sustentación.

- **Explicación completa, sin conocimientos previos** (arquitectura, código, pruebas, negocio): [docs/guia-del-producto.md](docs/guia-del-producto.md)
- **Contexto, decisiones y plan por fases:** [CLAUDE.md](CLAUDE.md)
- **Todos los comandos, en orden:** [docs/comandos.md](docs/comandos.md)

## Cómo funciona

```
CASA (misma WiFi)                         NUBE                                   TELÉFONO
Enchufe BSD04 ──WiFi local──▶ Agente ──HTTPS──▶ API FastAPI (Render) ──REST + WebSocket──▶ App (Android e iPhone)
   ▲                           (Mac)  ◀──WSS───        │        │
   └──── prender / apagar ─────┘     órdenes     PostgreSQL   Correo (Brevo) · Push (Expo) · Google
                                                  (Neon)
```
- El **agente** es un programa en un computador de la casa: lee cada enchufe cada 5 s por la red local, guarda las lecturas si se cae internet y las reenvía, y ejecuta las órdenes de prender y apagar.
- La **API** guarda las lecturas, calcula energía y costo, evalúa los avisos cada 20 s, ejecuta las rutinas y avisa a la app en vivo.
- La **app** solo muestra: los costos, el semáforo y las equivalencias los calcula el servidor. **La app nunca habla con Tuya.**

## Qué hace (historias de usuario)
| HU | Qué resuelve | Dónde se ve |
| --- | --- | --- |
| HU-01 | Cuánto gasta cada dispositivo, en pesos y en vivo | Inicio, Dispositivo |
| HU-02 | Aviso si un dispositivo de riesgo lleva mucho tiempo prendido, con botón «Apagar ahora» | Avisos |
| HU-03 | Para cuántos días alcanza el saldo prepago | Inicio, Saldo prepago |
| HU-04 | Semáforo contra el promedio de las facturas y equivalencias cotidianas | Inicio |
| HU-05 | Simulador: ¿te conviene cambiar la nevera por una de mejor etiqueta RETIQ? | Consejos, Cambiar un dispositivo |
| HU-07 | Línea de subsistencia (130 kWh/mes en Medellín) con aviso al 80 % | Inicio, Avisos |
| HU-08 | Rutinas de apagado por horario | Explorar › Rutinas |
| — | Aviso de consumo anómalo por dispositivo, consejos con ahorro estimado, varias casas por cuenta, ayuda al cliente (correo y WhatsApp) | Avisos, Consejos, Ajustes |
| HU-06 | Excedentes solares | Fuera de alcance |

## Estado
| Parte | Estado |
| --- | --- |
| Hardware (enchufe BSD04 por red local) | Verificado; escalas confirmadas ([ADR 0001](docs/decisiones/0001-escalas-data-points-bsd04.md)) |
| API en la nube | En producción: https://gestion-consumo-api.onrender.com (`/salud`, `/docs`) |
| Tiempo real | Del enchufe a la app en 0,44 s como máximo (criterio: ≤ 5 s) |
| Avisos y control | Aviso a los 15 s (≤ 60 s); apagar en 0,96 s (≤ 10 s) |
| Costo | Reproduce al centavo una factura real de EPM |
| App | Rediseño premium (Inter, íconos Phosphor, bordes finos); falta el ensayo de 30 min en teléfonos reales |
| Pendientes | Precisión con bombillo incandescente, ensayo y video (Fase 6); push con la app cerrada y tiendas (Fase 7). Detalle: [verificación de calidad](docs/verificacion-calidad.md) |

## Carpetas
| Carpeta | Qué hay | Cómo correrlo |
| --- | --- | --- |
| [apps/mobile](apps/mobile) | App Expo SDK 57 (React Native, TypeScript): 33 pantallas, pestañas Inicio · Explorar · Avisos · Ajustes | [README](apps/mobile/README.md) |
| [services/api](services/api) | API FastAPI (Python 3.12): 12 módulos, 19 tablas, 12 migraciones, tareas programadas | [README](services/api/README.md) |
| [services/agent](services/agent) | Agente local (Python, TinyTuya): lectura, cola sin internet, órdenes, programa instalable para Mac | [README](services/agent/README.md) |
| [docs](docs) | 12 decisiones (ADR), 8 historias de usuario, comandos, manual de diseño, guía de prueba, verificación de calidad | [docs](docs/README.md) |
| [infra](infra) · [render.yaml](render.yaml) | PostgreSQL local con Docker y el despliegue en Render | — |

## Arranque rápido
Requisitos: Node 20+, Python 3.12, Docker (solo para la base local) y Expo Go en el teléfono.
```
# App contra la API en la nube (lo más rápido)
cd apps/mobile && npm install && npm start          # escanea el QR con Expo Go

# API local
docker compose -f infra/local/docker-compose.yml up -d
cd services/api && python3.12 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/alembic upgrade head && .venv/bin/uvicorn app.main:app --reload    # http://localhost:8000/docs

# Agente (en el computador de la casa)
cd services/agent && python3.12 -m venv .venv && .venv/bin/pip install -e .
.venv/bin/python -m agent --vincular 123456         # el código de 6 números que muestra la app
```
Todo paso a paso (agente simulado, programa de Mac, vitrina de diseño, despliegue): [docs/comandos.md](docs/comandos.md).

## Pruebas
| Parte | Comando | Pruebas |
| --- | --- | --- |
| App | `cd apps/mobile && npx tsc --noEmit && npx jest` | 239 (incluye accesibilidad: texto ≥ 15 px y toques ≥ 44 px) |
| API | `cd services/api && .venv/bin/pytest` | 376 (contra PostgreSQL real) |
| Agente | `cd services/agent && .venv/bin/pytest` | 79 |
| Diseño | `cd apps/mobile && npm run vitrina:servidor` y `npm run vitrina -- <carpeta>` | Capturas de las 33 pantallas con datos de ejemplo |

## Tecnología
App: Expo SDK 57, React Native 0.86, TypeScript estricto, Expo Router, TanStack Query, Zustand, expo-secure-store, Inter, Phosphor Icons.
API: FastAPI, SQLAlchemy 2, Alembic, PostgreSQL (Neon), APScheduler, Argon2, JWT, cifrado Fernet, Brevo (correo), Expo Push, Google OAuth.
Agente: Python 3.12, TinyTuya, SQLite, websockets; programa de Mac con PyInstaller.

## Seguridad
- Nunca en el repositorio: `.env*`, `devices.json` (claves locales de los enchufes) y `tinytuya.json` están en `.gitignore`. Variables en [.env.example](.env.example).
- Contraseñas con Argon2; sesión con JWT (15 min, renovación de 30 días) guardada en el almacén seguro del teléfono.
- La clave local de cada enchufe se guarda cifrada y solo la recibe el agente asignado ([ADR 0008](docs/decisiones/0008-agente-por-enchufe-y-clave-local-cifrada.md)).
- Consentimiento de datos en el registro y «Eliminar mi cuenta» (Ley 1581 de 2012, [ADR 0009](docs/decisiones/0009-datos-personales-y-supresion.md)).
- Antes de abrir la app a otras personas: apagar `COMPARTIR_ENCHUFES` en Render ([ADR 0011](docs/decisiones/0011-mismo-enchufe-en-varias-cuentas.md)) y rotar los secretos que quedaron expuestos en el chat (Neon, Tuya, token de agente).
