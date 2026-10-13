# Guía de prueba: cómo correr y probar todo

Orden: (1) servidor, (2) Google, (3) app en los teléfonos, (4) agente con el enchufe, (5) qué verificar. Comandos desde la raíz del proyecto
(`cd /Users/estebanechavarria/Downloads/gestion-consumo-energetico`). Si `node` o `docker` no se reconocen, abre una terminal nueva o corre:
`export PATH=/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH`.

## 1. El servidor (API)
Está en Render: `https://gestion-consumo-api.onrender.com`. Despiértalo 2 minutos antes de probar abriendo `/salud` en el navegador:
debe mostrar `{"estado":"ok"}`. Para saber si tiene el código nuevo, abre `/docs`: deben aparecer las rutas `/auth/google/inicio` y `/auth/yo`.

**Si `/salud` no responde o `/docs` no tiene esas rutas:** en Render abre el servicio `gestion-consumo-api` → *Events* y *Logs*. Si el último despliegue
dice "failed" o pide valores pendientes, mira la sección 6.

### Plan B: servidor en tu Mac (sin Render ni Google)
```
docker compose -f infra/local/docker-compose.yml up -d          # PostgreSQL
cd services/api
.venv/bin/alembic upgrade head
.venv/bin/python seeds/tarifas.py                               # tarifa EPM de septiembre 2026
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000       # déjalo corriendo
```
Averigua la IP del Mac (`ipconfig getifaddr en0`, p. ej. 192.168.78.149) y en `apps/mobile/.env` pon `EXPO_PUBLIC_API_URL=http://192.168.78.149:8000`.
El agente usa `AGENT_API_URL=http://127.0.0.1:8000`. Con este plan **Google no funciona** (su redirect exige una dirección pública con https).

## 2. Inicio de sesión con Google (una sola vez)
1. Entra a <https://console.cloud.google.com> con tu cuenta y crea un proyecto (p. ej. `apague-y-vamonos`).
2. Menú *APIs y servicios* → *Pantalla de consentimiento de OAuth* (o *Google Auth Platform*): nombre de la app, correo de soporte, tipo de usuario **Externo**.
   Mientras la app esté en modo **Pruebas**, agrega como *usuarios de prueba* los correos de Gmail que van a probar (máximo 100). Los permisos que usamos
   (`openid`, `email`, `profile`) son básicos: si prefieres que entre cualquier cuenta de Google, pasa la app a *En producción*; no pide verificación con estos permisos.
3. *Credenciales* → *Crear credenciales* → *ID de cliente de OAuth* → tipo **Aplicación web** → en *URI de redireccionamiento autorizados* agrega **exactamente**:
   `https://gestion-consumo-api.onrender.com/auth/google/callback`
4. Google te muestra el **ID de cliente** y el **Secreto del cliente**. Cópialos.
5. En Render → servicio → *Environment* agrega `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` y guarda (redespliega solo). **No los pegues en el chat ni en el repositorio.**
6. Prueba: `https://gestion-consumo-api.onrender.com/auth/google/inicio?redirect_uri=exp://x&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&state=s`
   debe llevarte a la pantalla de Google (si dice 503, faltan las variables).

Los nombres de los menús de Google cambian de vez en cuando; lo importante son el tipo "Aplicación web" y la URI exacta.

## 3. La app en los teléfonos
1. Instala **Expo Go** (App Store / Google Play) en el iPhone y en el Android. Los dos en la misma WiFi del Mac, sin datos móviles.
2. En el Mac:
   ```
   cd apps/mobile        # ¡la app está en esta carpeta, no en la raíz!
   npm install
   npm start
   ```
   Aparece un QR. Android: escanéalo desde Expo Go. iPhone: escanéalo con la cámara (la primera vez permite *Red local* a Expo Go).
3. Si no abre: `npm run start:tunnel` (funciona aunque la WiFi aísle los dispositivos; más lento). Ver [apps/mobile/README.md](../apps/mobile/README.md).

## 4. El agente (lleva el consumo del enchufe a la app)
Para datos **reales**, el Mac debe estar en la **misma WiFi que el enchufe** (la de `192.168.78.x`; si estás en otra red el agente dirá "no responde"). Ya tienes `services/agent/devices.json` (clave local del enchufe).
**Sin el enchufe a la mano o en otra red:** usa el enchufe simulado (paso 3 de abajo).
1. En la app, **Mi casa → Vincular agente → Crear clave del agente**. Copia las dos líneas (`AGENT_API_URL` y `AGENT_TOKEN`). Se muestran **una sola vez**.
2. Pégalas en el archivo `.env` de la raíz del proyecto, **reemplazando** las líneas `AGENT_API_URL` y `AGENT_TOKEN` que ya existan (las del usuario demo).
3. Corre el agente y déjalo abierto:
   ```
   cd services/agent
   .venv/bin/python -m agent                      # enchufe real (misma WiFi)
   .venv/bin/python -m agent --simular SIM-001    # enchufe simulado: en la app agrega un enchufe con ese ID
   ```
   Real: debe decir `conectado en 192.168.78.x (protocolo 3.5)`. Simulado: avisa `MODO SIMULACIÓN` y envía un ventilador virtual (26,5 W, se apaga 20 s cada 3 min; `--vatios 60` cambia la potencia).
   Usa el simulador solo en un hogar de pruebas: sus datos no son reales.
4. En Mi casa, el agente pasa a **conectado** en menos de un minuto.

## 5. Qué probar (en este orden)
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 1 | **Crear cuenta** con correo, contraseña y la casilla de tratamiento de datos | Sin la casilla el botón queda deshabilitado; con ella entras directo |
| 2 | **Tu hogar**: nombre, estrato, medidor | Pasa a Inicio vacío ("Todavía no hay enchufes") |
| 3 | **Mi casa → Agregar enchufe**: nombre y el ID de Tuya (`eb182b7a119cf6aaeecf66`) | Aparece en la lista y en Inicio |
| 4 | **Vincular agente** y correr el agente (sección 4) | "conectado"; en Inicio el aparato muestra su potencia |
| 5 | Conecta el ventilador al enchufe | La potencia cambia en 1–2 s; el costo de hoy sube en pesos |
| 6 | **Tocar el aparato** (Dispositivo) | Estado, potencia, costo de hoy y del mes; barras por Día/Semana/Mes |
| 7 | Segundo teléfono: entra con la misma cuenta | Mismo costo (puede diferir unos centavos por el instante del refresco) |
| 8 | **Cerrar sesión** y **Continuar con Google** | Si es tu primera vez con ese Gmail, pide el consentimiento y luego el hogar; si no, entra |
| 9 | Entrar con Google con el correo de una cuenta ya creada por correo | Entra a **la misma cuenta** (se vinculan, no se duplica) |
| 10 | Apaga el agente 1 min y préndelo | En Inicio sale "Dato con retraso"; al volver no hay huecos |
| 11 | Mi casa → Editar hogar (cambia el estrato) | Los costos se recalculan con la tarifa del nuevo estrato |
| 12 | Quitar el enchufe | Pide confirmación y avisa que borra el historial |

Usuario de demo ya cargado (con lecturas): correo y contraseña en `.env.demo` (no versionado).

## 5b. Pruebas de la Fase 4 (avisos, control, rutinas, prepago)
Con el agente corriendo (real, o simulado con `.venv/bin/python -m agent --simular SIM-001` y un enchufe con ese ID en la app):
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 13 | **Encender/apagar:** toca el aparato en Inicio y mueve el interruptor "Está prendido" | En 1–2 s el estado cambia (con el enchufe real, se corta la corriente). Si no hay agente, dice por qué |
| 14 | **Aviso de alto riesgo:** Mi casa → toca el enchufe → marca "Avisarme si se queda encendido demasiado tiempo" con **2 minutos** → Guardar | A los ~2 min 20 s aparece el aviso en rojo en **Avisos** (pestaña con contador), con el botón **Apagar ahora** |
| 15 | Toca **Apagar ahora** en ese aviso | "Listo, ya lo apagamos." y el enchufe pasa a apagado |
| 16 | **Cuántos avisos:** en Avisos elige Pocas / Normales / Muchas | Queda guardado al volver a entrar |
| 17 | **Rutina:** Mi casa → Nueva rutina → apagar a una hora de **dentro de 2 minutos** (24 h, ej. 15:42), días de hoy | A esa hora el aparato se apaga solo; la tarjeta dice "Se apagó hace…". Si no se pudo, sale un aviso amarillo |
| 18 | **Prepago:** Editar hogar → medidor *Prepago*; luego "Anotar mi saldo" (ej. $30.000) y otra anotación otro día (ej. $26.000) | Con 2 anotaciones de días distintos aparece "Le alcanza hasta el …". Si quedan menos de 48 h, tarjeta roja y un aviso |
| 19 | **Línea de subsistencia:** Inicio muestra la barra en porcentaje. Mi casa → "Anotar lectura del medidor": anota la lectura de tu factura | Con 2 lecturas la barra usa el medidor (toda la casa) en vez de solo los enchufes |
Notas: el push con la app cerrada solo funciona en Android con una compilación propia (no en Expo Go). Con la app abierta recibes notificación del sistema
si diste el permiso. Los avisos se evalúan cada 20 s en el servidor, y las rutinas cada minuto.

## 6. Si algo falla
| Síntoma | Causa probable y qué hacer |
| --- | --- |
| Expo Go no abre el proyecto | iPhone: *Ajustes → Expo Go → Red local* activado. Misma WiFi sin datos móviles. En el navegador del teléfono abre `http://IP-del-Mac:8081` (debe mostrar JSON); si no carga, usa `npm run start:tunnel` |
| El login se queda cargando mucho | Render dormido: espera hasta ~1 min (la pantalla lo avisa) |
| Google: `503` | Faltan `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` en Render |
| Google: `redirect_uri_mismatch` | La URI del paso 2.3 no es exactamente `https://gestion-consumo-api.onrender.com/auth/google/callback` |
| Google: "acceso bloqueado / la app no está verificada" | El Gmail no está en *usuarios de prueba* (o pasa la app a producción) |
| `/docs` de Render sin rutas de Google | Despliegue pendiente o fallido: *Events* y *Logs* de Render. Si el blueprint pide valores para `GOOGLE_*`, ponlos (aunque sea temporalmente un texto cualquiera) para que el despliegue siga |
| Inicio vacío aunque el agente corre | El ID de Tuya del enchufe no coincide, o el token del agente es de otro hogar. Revisa el log del agente: `La API no reconoce N lecturas` |
| "Dato con retraso" | El agente no está enviando hace más de 1 minuto |
| La cuenta de Google pide aceptar datos y luego "Tu hogar" | Es lo esperado en una cuenta nueva |
| Contraseña olvidada | Aún no existe la recuperación por correo (necesita un servicio de envío de correos); con Google no hace falta |

## 7. Lo que todavía no existe
Simulador RETIQ, semáforo y equivalencias (Fase 5), el aviso de consumo anómalo, recuperación de contraseña y verificación del correo (necesitan un servicio de correo), y la compilación propia para instalar sin Expo Go.
