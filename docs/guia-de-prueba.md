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
1. En la app, **Explorar → Agentes → Agregar agente**: ponle un nombre y toca «Ver el código». Aparece un código de 6 números (vale 10 minutos y sirve una vez).
2. En el computador, abre **«Apague y vamonos.app»** (se genera con `services/agent/instalador/construir_mac.sh`; la primera vez clic derecho → Abrir) y escribe el código en la ventana. Verás un ⚡ en la barra de menús. (Alternativa para desarrollo, sin la app, en una terminal:) No hay que copiar claves ni tocar el `.env`:
   ```
   cd services/agent
   .venv/bin/python -m agent --vincular 123456
   ```
   Dice «quedó vinculado como «Sala»». El token se guarda solo en una carpeta tuya (`~/Library/Application Support/ApagueYVamonos/agente.json`, solo legible por ti). Para olvidarlo: `--desvincular`.
3. Corre el agente y déjalo abierto. Ya vinculado, **pide a la API qué enchufes le tocan** (los que le asignes en la app) y los vuelve a pedir cada minuto: no necesita `devices.json`:
   ```
   cd services/agent
   .venv/bin/python -m agent                      # enchufe real (misma WiFi)
   .venv/bin/python -m agent --simular SIM-001    # enchufe simulado: en la app agrega un enchufe con ese ID
   ```
   Real: debe decir `conectado en 192.168.78.x (protocolo 3.5)`. Simulado: avisa `MODO SIMULACIÓN` y envía un ventilador virtual (26,5 W, se apaga 20 s cada 3 min; `--vatios 60` cambia la potencia).
   Usa el simulador solo en un hogar de pruebas: sus datos no son reales.
4. En Explorar → Agentes, el agente pasa a **conectado** en menos de un minuto.

## 5. Qué probar (en este orden)
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 1 | **Crear cuenta** con correo, contraseña y la casilla de tratamiento de datos | Sin la casilla el botón queda deshabilitado; con ella entras directo |
| 2 | **Tu hogar**: nombre, estrato, medidor | Pasa a Inicio vacío ("Todavía no hay enchufes") |
| 3 | **Explorar → Enchufes → Conectar un enchufe**: nombre y el ID de Tuya (`eb182b7a119cf6aaeecf66`) | Aparece en la lista y en Inicio |
| 4 | **Vincular agente** y correr el agente (sección 4) | "conectado"; en Inicio el aparato muestra su potencia |
| 5 | Conecta el ventilador al enchufe | La potencia cambia en 1–2 s; el costo de hoy sube en pesos |
| 6 | **Tocar el aparato** (Dispositivo) | Estado, potencia, costo de hoy y del mes; barras por Día/Semana/Mes |
| 7 | Segundo teléfono: entra con la misma cuenta | Mismo costo (puede diferir unos centavos por el instante del refresco) |
| 8 | **Cerrar sesión** y **Continuar con Google** | Si es tu primera vez con ese Gmail, pide el consentimiento y luego el hogar; si no, entra |
| 9 | Entrar con Google con el correo de una cuenta ya creada por correo | Entra a **la misma cuenta** (se vinculan, no se duplica) |
| 10 | Apaga el agente 1 min y préndelo | En Inicio sale "Dato con retraso"; al volver no hay huecos |
| 11 | Explorar → Mis casas → Editar esta casa (cambia el estrato) | Los costos se recalculan con la tarifa del nuevo estrato |
| 12 | Quitar el enchufe | Pide confirmación y avisa que borra el historial |

Usuario de demo ya cargado (con lecturas): correo y contraseña en `.env.demo` (no versionado).

## 5b. Pruebas de la Fase 4 (avisos, control, rutinas, prepago)
Con el agente corriendo (real, o simulado con `.venv/bin/python -m agent --simular SIM-001` y un enchufe con ese ID en la app):
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 13 | **Encender/apagar:** toca el aparato en Inicio y mueve el interruptor "Está prendido" | En 1–2 s el estado cambia (con el enchufe real, se corta la corriente). Si no hay agente, dice por qué |
| 14 | **Aviso de alto riesgo:** Explorar → Enchufes → toca el enchufe → marca "Avisarme si se queda encendido demasiado tiempo" con **2 minutos** → Guardar | A los ~2 min 20 s aparece el aviso en rojo en **Avisos** (pestaña con contador), con el botón **Apagar ahora** |
| 15 | Toca **Apagar ahora** en ese aviso | "Listo, ya lo apagamos." y el enchufe pasa a apagado |
| 16 | **Cuántos avisos:** en Avisos elige Pocas / Normales / Muchas | Queda guardado al volver a entrar |
| 17 | **Rutina:** Explorar → Rutinas → Nueva rutina → apagar a una hora de **dentro de 2 minutos** (24 h, ej. 15:42), días de hoy | A esa hora el aparato se apaga solo; la tarjeta dice "Se apagó hace…". Si no se pudo, sale un aviso amarillo |
| 18 | **Prepago:** Editar hogar → medidor *Prepago*; luego "Anotar mi saldo" (ej. $30.000) y otra anotación otro día (ej. $26.000) | Con 2 anotaciones de días distintos aparece "Le alcanza hasta el …". Si quedan menos de 48 h, tarjeta roja y un aviso |
| 19 | **Línea de subsistencia:** Inicio muestra la barra en porcentaje. Explorar → Facturas y medidor → "Anotar lectura del medidor": anota la lectura de tu factura | Con 2 lecturas la barra usa el medidor (toda la casa) en vez de solo los enchufes |
Notas: el push con la app cerrada solo funciona en Android con una compilación propia (no en Expo Go). Con la app abierta recibes notificación del sistema
si diste el permiso. Los avisos se evalúan cada 20 s en el servidor, y las rutinas cada minuto.

## 5c. Pruebas de la Fase 5 (semáforo, equivalencias, consejos, simulador)
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 20 | Inicio sin datos: mira la tarjeta de arriba | Dice "Falta su histórico" y no muestra ningún color; el botón lleva a anotar las facturas |
| 21 | **Explorar → Facturas y medidor → Anotar mis facturas:** copia los 6 meses del cuadro "Histórico de consumos" de una factura de EPM | Muestra "Su promedio hoy" (con la factura de ejemplo: 179 kWh) |
| 22 | **Explorar → Facturas y medidor → Anotar lectura del medidor** dos veces en días distintos (o la misma factura: lectura anterior y actual) | Inicio muestra el semáforo: verde "Vas bien", amarillo "Vas medio alto" o rojo "Vas alto", y cuántos pesos pagaría de menos o de más |
| 23 | Con el enchufe midiendo, mira "Lo que han medido sus enchufes hoy" | Cuando el gasto da para una unidad entera aparecen "Es como dejar el televisor… / O cargar el celular…" |
| 24 | Pestaña **Consejos** | Primero lo que falta (facturas, medidor, enchufe); luego el aparato que más gasta y, si de noche gasta, una rutina con el ahorro medido. Nunca sugiere apagar una nevera |
| 25 | En Consejos toca **Comparar con uno nuevo** (aparece para neveras, lavadoras, aires y calentadores con 2 días de datos) | Abre el simulador con lo que midió el enchufe; escribe el kWh/mes de la etiqueta del aparato nuevo y su precio |
| 26 | **Calcular** | "Sí/No le conviene", lo que gasta cada uno al mes, cuánto ahorra, en cuánto se paga y el balance a los años. Los supuestos (12 %, 10 años) se pueden cambiar |
Los precios de la hamburguesa (Big Mac, $32.900) y la caja de leche (Colanta 1 L, $7.500) salen de Rappi en Medellín (2026-10-13); `GET /equivalencias` muestra la fuente de cada una.

## 5d. Navegación por categorías, varias casas y ayuda
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 23 | Abre la app | Cuatro pestañas abajo: Inicio, Explorar, Avisos, Ajustes |
| 24 | **Explorar** | Íconos redondos agrupados en Mis aparatos, Mi plata, Ahorra y Mi cuenta; cada uno abre su sección |
| 25 | Entra a **Agentes** por primera vez | Sale una tarjeta verde «¿Primera vez en Agentes?». «Ahora no» la quita y no vuelve a salir |
| 26 | Toca el **?** de la cabecera | Explica qué es, para qué sirve y cómo se usa |
| 27 | **Ajustes → Volver a mostrar las sugerencias**, y entra a otra sección | Las sugerencias vuelven a salir una vez |
| 28 | En Inicio toca el **nombre de la casa → Agregar otra casa** | Crea la casa con su estrato y pasa a verla; Inicio, enchufes, agentes y avisos quedan vacíos (son de la casa nueva) |
| 29 | Vuelve a tocar el nombre y elige la primera casa | Vuelven sus enchufes y su consumo. Cierra y abre la app: recuerda la última casa |
| 30 | **Explorar → Instrucciones** | Lista de todos los temas explicados |
| 31 | Botón **Continuar con Google** | Lleva el logo de Google con sus colores |

## 5e. Agentes asignados a enchufes
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 32 | **Explorar → Agentes → Vincular agente** dos veces con nombres distintos (por ejemplo «Sala» y «Patio») | Cada agente sale con su estado y «No lee ningún enchufe» |
| 33 | **Explorar → Enchufes → toca un enchufe** | Aparece «¿Qué agente lo lee?» con Ninguno y los agentes; elige uno y guarda |
| 34 | Vuelve a la lista de Enchufes | Cada enchufe dice «Lo lee: Sala» (o «Sin agente asignado: no llegarán datos») |
| 35 | Corre el agente de Sala y deja el de Patio apagado; en Inicio toca el aparato asignado a Patio y apágalo | Dice «el agente «Patio», que lee este enchufe, no está conectado» |
| 36 | Corre un agente que NO es el asignado al enchufe | Sus lecturas de ese enchufe se descartan (el log del agente lo avisa) |
| 37 | **Agentes → Cambiar nombre** | El nombre cambia en Agentes y en la lista de Enchufes |
| 38 | **Agentes → Eliminar** | Pide confirmación; sus enchufes pasan a «Sin agente asignado» |

## 5f. Eliminar una casa y corregir lecturas del medidor
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 39 | **Explorar → Facturas y medidor → Anotar lectura del medidor**: anota un número con un cero de más y luego uno correcto menor | La segunda lectura se rechaza («no puede ser menor que la anterior») |
| 40 | En «Anotaciones anteriores» toca el bote de basura de la lectura mala | Pide confirmación; al borrarla, la lectura correcta ya se puede anotar |
| 41 | **Explorar → Mis casas → Eliminar esta casa** en una casa de prueba | Pide confirmación, nombra la casa y dice que se borra todo; al confirmar pasa a otra casa (si era la única, a crear una nueva) |
| 42 | **Explorar → Agentes → Eliminar** un agente que está conectado | El programa de Mac de ese agente deja de recibir órdenes al instante |

## 5g. Tus datos: política, eliminar la cuenta e íconos
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 43 | En «Crear cuenta», toca «Leer la política de tratamiento de datos» (sin haber entrado) | Se abre la política con sus 9 secciones |
| 44 | **Ajustes → Tus datos → Política de tratamiento de datos** | Lo mismo; la sección «Consultas y reclamos» da el correo juanechavarria194@gmail.com |
| 45 | **Ajustes → Eliminar mi cuenta** con una cuenta de prueba (¡no la tuya!) | El botón está apagado hasta escribir la contraseña; con una mala dice «La contraseña no es correcta» |
| 46 | Confirma con la contraseña buena | Vuelve a la pantalla de entrada; esa cuenta ya no existe y su correo se puede registrar de nuevo |
| 47 | Mira el ícono de la app en el teléfono y la pantalla de arranque | Rayo verde sobre fondo oscuro; arranque crema con rayo verde (con Expo Go se ve el de Expo: el nuestro aparece al compilar la app) |

## 5h. Recuperar la contraseña y verificar el correo
Necesita el envío de correos activo (ADR 0010, «Activarlo»). Sin él, el servidor lo dice en su registro y no llega nada; en desarrollo local usa `CORREO_CONSOLA=true` y mira el código en el log de uvicorn.
| # | Prueba | Debe pasar |
| --- | --- | --- |
| 48 | En el login, «¿Olvidaste tu contraseña?» → tu correo → «Enviarme el código» | Dice «Revisa tu correo»; llega un código de 6 números (mira en «spam») |
| 49 | Escribe el código con una contraseña nueva | «¡Listo! Cambiaste tu contraseña»; entras con la nueva y la vieja ya no sirve |
| 50 | Con el teléfono A con sesión abierta, haz la recuperación desde el teléfono B | Al abrir el A, pide entrar de nuevo (se cerró su sesión) |
| 51 | Escribe un código malo 5 veces | Después ni el bueno sirve: pide uno nuevo |
| 52 | **Ajustes**: «Correo sin verificar» → «Verificar mi correo» → código | Pasa a «Correo verificado» |
| 53 | Entra con Google | El correo ya sale verificado |

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
El aviso de consumo anómalo por aparato, recuperación de contraseña y verificación del correo (necesitan un servicio de correo), y la compilación propia para instalar sin Expo Go.
