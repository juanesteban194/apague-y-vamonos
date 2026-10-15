# Comandos de consola

Chuleta de todo lo que se corre en la terminal, **en el orden en que se usa**. El paso a paso con qué mirar en cada prueba está en [guia-de-prueba.md](guia-de-prueba.md).

**Primero, en cada terminal nueva, copia y pega este bloque completo.** La primera línea hace que zsh entienda los comentarios (`# …`) que verás al lado de los comandos: sin ella, zsh los toma como parte del comando y da errores como «export: not valid in this context».
```
setopt interactive_comments
export P=/Users/estebanechavarria/Downloads/gestion-consumo-energetico
cd $P
export PATH=/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH
```
`$P` es la carpeta del proyecto: **todos los comandos de este documento ya incluyen su `cd $P/...`**, así que se pueden pegar desde cualquier carpeta (no hace falta fijarse en dónde estás). Si abres otra terminal, vuelve a pegar este bloque.
Para no repetirlo nunca (una sola vez): `echo "setopt interactive_comments" >> ~/.zshrc` y abre una terminal nueva. La línea del `export PATH` solo hace falta si `node` o `docker` «no se reconocen».

## Orden de ejecución

### A. Una sola vez (instalar)
Cada comando incluye su carpeta: pégalo tal cual.
| # | Comando | Para qué |
| --- | --- | --- |
| 1 | `cd $P/apps/mobile && npm install` | Dependencias de la app |
| 2 | `cd $P/services/api && python3.12 -m venv .venv && .venv/bin/pip install -e ".[dev]"` | Solo si vas a probar o correr la API en tu Mac |
| 3 | `cd $P/services/agent && python3.12 -m venv .venv && .venv/bin/pip install -e ".[dev]"` | El agente y sus pruebas |
| 4 | `cd $P/services/agent && .venv/bin/pip install -e ".[instalador]"` | Solo si vas a construir el programa de Mac |

### B. Antes de la demostración (10 minutos antes)
| # | Comando | Qué debe pasar |
| --- | --- | --- |
| 1 | `curl https://gestion-consumo-api.onrender.com/salud` | `{"estado":"ok"}`. La primera vez puede tardar ~1 min (Render duerme). Repítelo hasta que responda |
| 2 | Render → servicio → *Events* | El último deploy está *Live* con tu último commit |
| 3 | Conecta el Mac a la **misma WiFi que el enchufe** (`192.168.78.x`) | Sin eso el agente dice «no responde» (o usa el enchufe simulado, sección 5) |

### C. Arrancar (cada vez, en este orden)
| # | Terminal | Comando | Qué hace |
| --- | --- | --- | --- |
| 1 | A | `cd $P/apps/mobile && npm start` | Genera el **QR** (sección 3). Escanéalo con Expo Go |
| 2 | — | Abre «Apague y vamonos.app» (sección 4) | Agente en segundo plano, con ícono ⚡ en la barra de menús. Si no tienes el `.app`: terminal B con `cd $P/services/agent && .venv/bin/python -m agent` |

### D. Primera vez con un agente nuevo (en la app y en el Mac)
| # | Dónde | Qué hacer |
| --- | --- | --- |
| 1 | App | **Explorar → Agentes → Agregar agente** → nombre → «Ver el código» (6 números, vale 10 min) |
| 2 | Mac | Abre el programa y escribe el código en la ventana. Terminal: `cd $P/services/agent && .venv/bin/python -m agent --vincular 123456` |
| 3 | App | Cuando diga «¡Listo! … está conectado» → **Explorar → Enchufes** → abre el enchufe → «¿Qué agente lo lee?» → elige → Guardar |
| 4 | Mac | En el menú ⚡ (o en el log): «Ahora lee: …». Se actualiza solo en ≤ 1 minuto |
| 5 | App | Inicio muestra el aparato con su potencia; prender y apagar desde su pantalla |

### E. Al terminar
| Qué | Comando |
| --- | --- |
| Detener la app | `Ctrl+C` en la terminal del QR |
| Detener el agente | Menú ⚡ → *Salir* (terminal: `Ctrl+C`) |
| Apagar la base local (si la usaste) | `docker compose -f $P/infra/local/docker-compose.yml down` |

## 1. Servidor (API)
**En la nube:** se despliega solo al hacer `git push` a `main` (Render corre `alembic upgrade head` al arrancar y la propia API carga tarifas y equivalencias). Render genera solo `JWT_SECRET` y `CLAVE_MAESTRA`.
```
curl https://gestion-consumo-api.onrender.com/salud          # ¿está vivo?
open https://gestion-consumo-api.onrender.com/docs           # documentación de la API (OpenAPI)
```
**Plan B, en tu Mac** (sin Render ni Neon; Google no funciona en este modo):
```
open -a Docker                                               # si Docker Desktop está cerrado; espera unos segundos
docker compose -f $P/infra/local/docker-compose.yml up -d       # PostgreSQL local (contenedor con base "energia")
cd $P/services/api
.venv/bin/alembic upgrade head                               # crea/actualiza las tablas
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000    # déjalo corriendo (carga tarifas y equivalencias solo)
ipconfig getifaddr en0                                       # IP del Mac: úsala en EXPO_PUBLIC_API_URL=http://<IP>:8000
docker compose -f $P/infra/local/docker-compose.yml down        # apagar la base (los datos se conservan)
```
Variables en el `.env` de la raíz (nunca se suben): `DATABASE_URL`, `JWT_SECRET` (≥ 32 caracteres), `CLAVE_MAESTRA` (cifra las claves de los enchufes: `openssl rand -hex 24`), `GOOGLE_CLIENT_ID/SECRET`, `BREVO_API_KEY` y `CORREO_REMITENTE_EMAIL` (envío de códigos por correo; en desarrollo `CORREO_CONSOLA=true` escribe el código en el log del servidor), y `TUYA_ACCESS_ID/SECRET` si quieres que la API pida las claves a Tuya. Nombres en [.env.example](../.env.example).

## 2. Base de datos
```
cd $P/services/api
.venv/bin/alembic upgrade head                          # aplicar migraciones
.venv/bin/alembic revision --autogenerate -m "mensaje"  # crear una migración nueva (revísala a mano); usa una base vacía aparte, no la de trabajo
.venv/bin/python seeds/tarifas.py                       # tarifa EPM (también la carga la API al arrancar)
.venv/bin/python seeds/equivalencias.py                 # equivalencias (idem)
docker exec -it local-postgres-1 psql -U energia -d energia   # consola SQL de la base local
```
Para la base de Neon se usa su cadena `DATABASE_URL` (en `.env.neon`, no versionado). Si tu red no alcanza el puerto 5432 de Neon, no hay que sembrar desde el Mac: la API lo hace al arrancar.

## 3. La app y el QR
```
cd $P/apps/mobile                       # la app NO está en la raíz del proyecto
cp ../../.env.example .env           # solo la primera vez; deja solo EXPO_PUBLIC_API_URL=https://gestion-consumo-api.onrender.com
npm start                            # genera el QR en la terminal (misma WiFi)
npm run start:tunnel                 # QR por túnel: si la WiFi aísla los dispositivos (universidad, invitados). Más lento
npx expo start -c                    # igual que start pero limpiando la caché (si algo "no se actualiza")
```
- **QR:** aparece solo en la terminal cuando corre `npm start`. En esa terminal, `s` cambia entre Expo Go y development build, `r` recarga, `m` abre el menú, `Ctrl+C` detiene.
- **Android:** abre Expo Go y escanea el QR. **iPhone:** escanéalo con la cámara y ábrelo en Expo Go (activa *Ajustes → Expo Go → Red local*).
- **Sin QR:** en Expo Go escribe `exp://<IP del Mac>:8081`, o en el navegador del teléfono comprueba que `http://<IP del Mac>:8081` muestre un JSON.
- Simuladores en el Mac: `npm run ios` (requiere Xcode) · `npm run android` (requiere Android Studio).
- Si Expo Go dice que ya hay una sesión de otro usuario: `npx expo login` con la misma cuenta o cierra sesión en Expo Go.

Calidad de la app (antes de un commit):
```
cd $P/apps/mobile
npm run typecheck                    # TypeScript estricto
npm test                             # Jest
npm run api:types                    # regenera los tipos desde el OpenAPI de la API desplegada (si cambió la API, primero despliega)
```
Rutas tipadas desactualizadas (error de `href` en TypeScript): arranca `npm start` unos segundos y detenlo; las regenera.

## 4. El agente (enchufe → API)
Para datos reales, el Mac debe estar en la **misma WiFi que el enchufe**. Cada enchufe lo lee **un solo agente**, el que le asignes en la app.

### 4.1 Programa de Mac «Apague y vamonos.app» (el camino para el usuario)
```
cd $P/services/agent
./instalador/construir_mac.sh                       # construye dist/Apague-y-vamonos-Mac.zip (≈ 19 MB) y dist/Apague y vamonos.app
open "dist/Apague y vamonos.app"                    # primera vez: clic derecho → Abrir (no tiene firma de Apple de pago)
```
- La primera vez pide el código de 6 números (sección D de arriba). Después queda en la barra de menús (⚡), se abre solo al iniciar sesión y evita que el Mac se duerma por inactividad.
- Registro: `~/Library/Logs/ApagueYVamonos/agente.log` (también desde el menú ⚡ → *Ver el registro*). Datos y token: `~/Library/Application Support/ApagueYVamonos/`.
- Olvidar la vinculación: menú ⚡ → *Vincular de nuevo…*, o `rm -r ~/Library/Application\ Support/ApagueYVamonos`. Quitar el inicio automático: menú ⚡ → *Abrir al iniciar el Mac*.

### 4.2 Desde la terminal (desarrollo)
```
cd $P/services/agent
.venv/bin/python -m agent --vincular 123456         # vincula este equipo con el código de la app (guarda el token en tu carpeta de datos)
.venv/bin/python -m agent                           # corre; ya vinculado, pide a la API qué enchufes le tocan cada minuto
.venv/bin/python -m agent --desvincular             # olvida la vinculación
```
- Sin vinculación, `python -m agent` usa la forma antigua: `AGENT_API_URL` y `AGENT_TOKEN` del `.env` y el `devices.json` de este equipo.
- Enchufe simulado (para probar sin hardware ni la WiFi del enchufe; en la app agrega un enchufe con ese ID y asígnale el agente):
```
cd $P/services/agent
.venv/bin/python -m agent --simular SIM-001                 # ventilador virtual de 26,5 W
.venv/bin/python -m agent --simular SIM-001 --vatios 60     # otra potencia
```
Detener con `Ctrl+C`. La cola de lecturas sin enviar queda en `cola.sqlite` (junto al agente, o en la carpeta de datos si está vinculado) y se reenvía sola.

### 4.3 Herramientas de verificación (`services/agent/tools`)
```
cd $P/services/agent
.venv/bin/python tools/01_escanear_red.py                  # encuentra el enchufe en la red (IP y protocolo)
.venv/bin/python tools/02_leer_local.py                    # 10 min de lecturas locales (Fase 0)
.venv/bin/python tools/04_medir_latencia_ws.py --lecturas 30   # retraso enchufe → app (criterio ≤ 5 s); usa .env y .env.demo
.venv/bin/python -m tinytuya wizard                        # SOLO si el enchufe se re-empareja: regenera la clave local. Gasta cuota de Tuya Cloud
```
Regla: la cuota de Tuya Cloud no se gasta. El agente lee por LAN; el wizard, los comandos de respaldo en la nube y pedir la clave local de un enchufe (una sola vez) son lo único que la usa.

## 5. Pruebas automáticas
```
cd $P/services/api   && .venv/bin/pytest -q            # API (necesita la base local: docker compose ... up -d)
cd $P/services/agent && .venv/bin/pytest -q            # agente (las de Mac solo corren en macOS)
cd $P/apps/mobile    && npm run typecheck && npm test  # app
```
La API usa una base aparte (`energia_test`) en el Postgres local; no toca la de producción. Antes de un commit corre las de lo que tocaste: si `typecheck` falla, no hagas el commit.

## 6. Git
```
cd $P
git status -sb
git add <archivos> && git commit -m "mensaje"     # un commit por funcionalidad terminada, con su prueba
git push                                          # dispara el despliegue en Render (~2–9 min en el plan gratuito)
git log --oneline -10
```
`dist/` y `build/` (el programa de Mac construido) no se suben: el `.zip` se entrega aparte.

## 7. Problemas típicos
| Síntoma | Qué hacer |
| --- | --- |
| `npm install` falla con "no package.json" | Estás en la raíz: `cd $P/apps/mobile` |
| `node`/`docker` no se reconocen | Terminal nueva o el `export PATH=…` de arriba |
| «Cannot connect to the Docker daemon» | `open -a Docker` y espera ~10 s antes de `docker compose up -d` |
| Expo Go no abre el proyecto | Misma WiFi, sin datos móviles, permiso *Red local* en iPhone; si no, `npm run start:tunnel` |
| El agente dice «no responde» | Estás en otra WiFi que el enchufe: conéctate a la del enchufe o usa `--simular` |
| «Ese código no es válido o ya venció» | El código vale 10 min y sirve una vez: en la app, Agentes → «Ver código de vinculación» o «Usar en otro computador» |
| El enchufe dice «Sin agente asignado» | Explorar → Enchufes → abre el enchufe → «¿Qué agente lo lee?» |
| «el agente «X», que lee este enchufe, no está conectado» | Abre el programa de ese agente (o asígnale el enchufe a otro agente) |
| El menú ⚡ dice «sin enchufes asignados» | Asígnale enchufes en la app; el agente los toma en ≤ 1 minuto |
| El menú ⚡ dice «El servidor no reconoce este Mac» | Menú ⚡ → *Vincular de nuevo…* con un código nuevo |
| El agente avisa «asignados sin clave local» | La API aún no tiene la clave de ese enchufe: debe tener `TUYA_ACCESS_ID/SECRET` y `CLAVE_MAESTRA`; se reintenta cada hora |
| La app dice «Dato con retraso» | El agente está apagado o sin internet; al volver se reenvía lo guardado |
| Primer inicio de sesión muy lento | Render estaba dormido: espera ~1 min o despiértalo con `curl …/salud` |
| `/equivalencias` o `/docs` no muestran lo nuevo | Render → *Events*: el último deploy debe estar *Live* con tu commit |
| `construir_mac.sh` da «No module named agent.app_mac» al abrir el `.app` | Reconstruye con el script (usa rutas absolutas); no armes el `.app` a mano |
