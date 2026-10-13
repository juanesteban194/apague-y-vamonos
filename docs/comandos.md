# Comandos de consola

Chuleta de todo lo que se corre en la terminal. El paso a paso con qué mirar en cada prueba está en [guia-de-prueba.md](guia-de-prueba.md).
Todo parte de la raíz del proyecto; las carpetas importantes son distintas, así que **mira siempre en cuál estás** (`pwd`).

```
cd /Users/estebanechavarria/Downloads/gestion-consumo-energetico
export PATH=/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH   # si node o docker "no se reconocen"
```

## 1. Demo normal (la que usarás casi siempre)
La API y la base ya están en la nube (Render + Neon). Solo corres la app y, para datos reales, el agente. Tres terminales:

| Terminal | Comandos | Qué hace |
| --- | --- | --- |
| A. Despertar la API | `curl https://gestion-consumo-api.onrender.com/salud` | Debe responder `{"estado":"ok"}`. Hazlo 2 min antes; la primera vez puede tardar ~1 min |
| B. App + QR | `cd apps/mobile && npm install && npm start` | Genera el QR (ver sección 3) |
| C. Agente | `cd services/agent && .venv/bin/python -m agent` | Lee el enchufe y manda las lecturas |

## 2. Servidor (API)
**En la nube:** se despliega solo al hacer `git push` a `main` (Render corre `alembic upgrade head` y carga tarifas y equivalencias al arrancar).
```
curl https://gestion-consumo-api.onrender.com/salud          # ¿está vivo?
open https://gestion-consumo-api.onrender.com/docs           # documentación de la API (OpenAPI)
```
**Plan B, en tu Mac** (sin Render ni Neon; Google no funciona en este modo):
```
docker compose -f infra/local/docker-compose.yml up -d       # PostgreSQL local (contenedor con base "energia")
cd services/api
python3.12 -m venv .venv && .venv/bin/pip install -e ".[dev]"   # solo la primera vez
.venv/bin/alembic upgrade head                               # crea las tablas
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000    # déjalo corriendo (carga tarifas y equivalencias solo)
ipconfig getifaddr en0                                       # IP del Mac: úsala en EXPO_PUBLIC_API_URL=http://<IP>:8000
docker compose -f infra/local/docker-compose.yml down       # apagar la base (los datos se conservan)
```
Variables: `.env` en la raíz (`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`…). Nombres en [.env.example](../.env.example). Nunca se suben al repositorio.

## 3. La app y el QR
```
cd apps/mobile                       # la app NO está en la raíz
cp ../../.env.example .env           # solo la primera vez; deja solo EXPO_PUBLIC_API_URL=https://gestion-consumo-api.onrender.com
npm install                          # solo la primera vez o si cambian las dependencias
npm start                            # genera el QR en la terminal (misma WiFi)
npm run start:tunnel                 # QR por túnel: úsalo si la WiFi aísla los dispositivos (universidad, invitados). Más lento
npx expo start -c                    # igual que start pero limpiando la caché (si algo "no se actualiza")
```
- **QR:** aparece solo en la terminal cuando corre `npm start`. En la misma terminal, `s` cambia entre Expo Go y development build, `r` recarga, `m` abre el menú, `Ctrl+C` detiene.
- **Android:** abre Expo Go y escanea el QR. **iPhone:** escanéalo con la cámara y ábrelo en Expo Go (activa *Ajustes → Expo Go → Red local*).
- **Sin QR:** en Expo Go escribe la dirección `exp://<IP del Mac>:8081` o, en el navegador del teléfono, comprueba que `http://<IP del Mac>:8081` muestre un JSON.
- Simuladores en el Mac: `npm run ios` (iPhone, requiere Xcode) · `npm run android` (requiere Android Studio).
- Si Expo Go dice que ya hay una sesión de otro usuario: `npx expo login` con la misma cuenta o cierra sesión en Expo Go.

Calidad de la app (antes de un commit):
```
cd apps/mobile
npm run typecheck                    # TypeScript estricto
npm test                             # Jest
npm run api:types                    # regenera los tipos desde el OpenAPI (si cambió la API)
```
Rutas tipadas desactualizadas: arranca `npm start` unos segundos y detenlo; las regenera.

## 4. El agente (enchufe → API)
Para datos reales, el Mac debe estar en la **misma WiFi que el enchufe** (`192.168.78.x`).
```
cd services/agent
python3.12 -m venv .venv && .venv/bin/pip install -e ".[dev]"    # solo la primera vez
```
1. En la app: **Explorar → Agentes → Vincular agente → Crear clave**. Copia `AGENT_API_URL` y `AGENT_TOKEN` (se muestran una sola vez) al `.env` de la raíz, reemplazando los que haya.
2. Correr:
```
.venv/bin/python -m agent                          # enchufe real (usa devices.json)
.venv/bin/python -m agent --simular SIM-001        # enchufe simulado (ventilador de 26,5 W); en la app agrega un enchufe con ese ID
.venv/bin/python -m agent --simular SIM-001 --vatios 60   # simulado con otra potencia
```
Detener con `Ctrl+C`. La cola de lecturas sin enviar queda en `services/agent/cola.sqlite` y se reenvía sola.

Herramientas de verificación (`services/agent/tools`):
```
.venv/bin/python tools/01_escanear_red.py                  # encuentra el enchufe en la red (IP y protocolo)
.venv/bin/python tools/02_leer_local.py                    # 10 min de lecturas locales (Fase 0)
.venv/bin/python tools/04_medir_latencia_ws.py --lecturas 30   # retraso enchufe → app (criterio ≤ 5 s); usa .env y .env.demo
.venv/bin/python -m tinytuya wizard                        # SOLO si el enchufe se re-empareja: regenera la clave local. Gasta cuota de Tuya Cloud
```
Regla: la cuota de Tuya Cloud no se gasta. El agente lee por LAN; el wizard y los comandos de respaldo en la nube son lo único que la usa.

## 5. Pruebas automáticas
```
cd services/api   && .venv/bin/pytest -q            # API (necesita la base local: docker compose ... up -d)
cd services/agent && .venv/bin/pytest -q            # agente
cd apps/mobile    && npm test && npm run typecheck  # app
```
La API usa una base aparte (`energia_test`) en el Postgres local; no toca la de producción.

## 6. Base de datos
```
cd services/api
.venv/bin/alembic upgrade head                          # aplicar migraciones
.venv/bin/alembic revision --autogenerate -m "mensaje"  # crear una migración nueva (revísala a mano)
.venv/bin/python seeds/tarifas.py                       # tarifa EPM (también la carga la API al arrancar)
.venv/bin/python seeds/equivalencias.py                 # equivalencias (idem)
docker exec -it local-postgres-1 psql -U energia -d energia   # consola SQL de la base local
```
Para la base de Neon se usa su cadena `DATABASE_URL` (en `.env.neon`, no versionado). Si tu red no alcanza el puerto 5432 de Neon, no hay que sembrar desde el Mac: la API lo hace al arrancar.

## 7. Git
```
git status -sb
git add <archivos> && git commit -m "mensaje"     # un commit por funcionalidad terminada, con su prueba
git push                                          # dispara el despliegue en Render (~2–9 min en el plan gratuito)
git log --oneline -10
```

## 8. Problemas típicos
| Síntoma | Qué hacer |
| --- | --- |
| `npm install` falla con "no package.json" | Estás en la raíz: `cd apps/mobile` |
| `node`/`docker` no se reconocen | Terminal nueva o el `export PATH=…` de arriba |
| Expo Go no abre el proyecto | Misma WiFi, sin datos móviles, permiso *Red local* en iPhone; si no, `npm run start:tunnel` |
| El agente dice "no responde" | Estás en otra WiFi que el enchufe; usa `--simular` o conéctate a `192.168.78.x` |
| La app dice "Dato con retraso" | El agente está apagado o sin internet; al volver se reenvía lo guardado |
| Primer inicio de sesión muy lento | Render estaba dormido: espera ~1 min o despiértalo con `curl …/salud` |
| `/equivalencias` o `/docs` no muestran lo nuevo | Render → *Events*: el último deploy debe estar *Live* con tu commit |
