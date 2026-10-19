# ADR 0008 — Un agente por enchufe, y la clave local cifrada en la base

**Fecha:** 2026-10-15 · **Estado:** pasos 1, 2 y 3 hechos para Mac (asignación; código de vinculación y claves cifradas; programa instalable de Mac). Windows: no se hizo

## Problema
El usuario no es técnico. Con varios agentes en una casa no sabía cuál leía cada enchufe, y para vincular un agente tenía que copiar líneas a un `.env` y correr un programa.

## Decisión 1 (hecha): el enchufe tiene un solo agente
- `dispositivos.agente_id` (opcional). Se asigna, cambia y quita desde la app (pantalla del enchufe); al eliminar un agente, sus enchufes quedan «sin agente».
- **Lecturas:** solo cuentan las del agente asignado; las de otro agente se descartan y la API lo informa (`de_otro_agente`). Un enchufe sin agente se lo queda el primero que lo lea, así el caso normal no pide configurar nada.
- **Órdenes (prender/apagar):** van solo al agente asignado, porque solo él tiene la clave de ese enchufe. Sin ese agente conectado, la app dice cuál es («el agente «Sala», que lee este enchufe, no está conectado») y, si hay otros agentes conectados, que ellos no pueden controlarlo. Respaldo por la nube de Tuya igual que antes.
- Un enchufe tiene **un** agente: dos leyendo el mismo mezclarían lecturas.
- La lista de agentes trae los enchufes que lee cada uno y si está conectado en ese momento; se les puede cambiar el nombre y eliminar.

## Decisión 2 (tomada por el equipo, 2026-10-15; hecha): la clave local se guarda cifrada
Antes (regla del proyecto): «la clave local nunca entra a la base de datos». Para que el usuario no tenga que tocar archivos, la API guardará la clave local de cada enchufe **cifrada** (clave maestra en una variable de entorno del backend, nunca en el repositorio) y se la entregará **solo al agente asignado**, por HTTPS. La app nunca la recibe ni la muestra.
- La clave se obtiene de Tuya Cloud una vez, al registrar el enchufe (una llamada por enchufe: cabe en la cuota).
- El agente se vincula con un **código de 6 dígitos** mostrado en la app y descarga su configuración (lista de enchufes y claves); ya no usa `devices.json` ni `.env` a mano.
- **Hecho:** `dispositivos.clave_local_cifrada` (Fernet, clave derivada de `CLAVE_MAESTRA`, que Render genera sola); `POST /hogares/{id}/agentes/con-codigo` y `POST …/agentes/{id}/codigo`; `POST /agentes/vincular` (sin sesión, máx. 8 intentos por minuto por origen y 30 en total, código de un solo uso que vence a los 10 minutos); `GET /agentes/configuracion` (con el token del agente). Si a un enchufe asignado le falta la clave, la API la pide a Tuya Cloud **una sola vez** (`/v1.0/devices/{id}`, 2 llamadas la primera vez) y la guarda; si Tuya no la da no insiste durante una hora.
- **Sin verificar con Tuya real:** esa consulta está probada solo con un servidor simulado; no se gastó cuota. Si Tuya no devuelve la clave (por ejemplo, el enchufe es de una cuenta no vinculada a nuestro proyecto), el enchufe queda «sin clave» y el agente lo avisa. Para usuarios que no son del equipo hace falta vincular su cuenta de Smart Life al proyecto de Tuya (riesgo ya anotado en los riesgos del proyecto).
- Programa del agente: `python -m agent --vincular CODIGO` guarda el token en la carpeta de datos del usuario (permisos 600); ya vinculado, pide su lista de enchufes a la API cada minuto y la aplica sin reiniciar.

## Plan
1. (hecho) Asignación agente ↔ enchufe, mensajes claros, renombrar y eliminar agentes.
2. Código de vinculación, claves cifradas y configuración automática del agente.
3. Empaquetar el agente: programa instalable o caja dedicada.

## Límites conocidos
- Alguien debe tener el agente corriendo en la misma WiFi que el enchufe: la app del teléfono no puede leerlo de forma fiable (iOS/Android la duermen).
- Al eliminar un agente que sigue conectado, su canal abierto no se cierra hasta que se desconecte; sus lecturas ya se rechazan (token inválido).
- **Paso 3 (hecho, solo Mac):** `services/agent/instalador/construir_mac.sh` genera «Apague y vamonos.app» con PyInstaller (Python propio, sin instalar nada): ventana nativa para el código, ícono ⚡ en la barra de menús, inicio con el Mac (LaunchAgent), una sola instancia, registro rotativo y `caffeinate` para que el Mac no se duerma por inactividad. Probado: construye, arranca vinculado, se conecta a la API y pide su configuración. **Sin verificar:** ver el ícono y la ventana del código en pantalla (la captura de pantalla no estaba permitida) y abrirlo desde otro usuario/Mac limpio.
- Sin cuenta de Apple de pago el programa no está firmado ni notarizado: la primera vez hay que abrirlo con clic derecho → Abrir. La firma «ad hoc» solo evita que el sistema lo trate como archivos sueltos.
- Windows: no se construyó (haría falta una máquina Windows o un servicio de compilación).
- Falta dónde publicar el `.zip` para que la app lo enlace («Descargar el programa»); hoy se entrega a mano.
