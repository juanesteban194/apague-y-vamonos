# ADR 0008 — Un agente por enchufe, y la clave local cifrada en la base

**Fecha:** 2026-10-15 · **Estado:** paso 1 hecho (asignación); paso 2 (vinculación sin consola) por hacer

## Problema
El usuario no es técnico. Con varios agentes en una casa no sabía cuál leía cada enchufe, y para vincular un agente tenía que copiar líneas a un `.env` y correr un programa.

## Decisión 1 (hecha): el enchufe tiene un solo agente
- `dispositivos.agente_id` (opcional). Se asigna, cambia y quita desde la app (pantalla del enchufe); al eliminar un agente, sus enchufes quedan «sin agente».
- **Lecturas:** solo cuentan las del agente asignado; las de otro agente se descartan y la API lo informa (`de_otro_agente`). Un enchufe sin agente se lo queda el primero que lo lea, así el caso normal no pide configurar nada.
- **Órdenes (prender/apagar):** van solo al agente asignado, porque solo él tiene la clave de ese enchufe. Sin ese agente conectado, la app dice cuál es («el agente «Sala», que lee este enchufe, no está conectado») y, si hay otros agentes conectados, que ellos no pueden controlarlo. Respaldo por la nube de Tuya igual que antes.
- Un enchufe tiene **un** agente: dos leyendo el mismo mezclarían lecturas.
- La lista de agentes trae los enchufes que lee cada uno y si está conectado en ese momento; se les puede cambiar el nombre y eliminar.

## Decisión 2 (tomada por el equipo, 2026-10-15; por implementar): la clave local se guarda cifrada
Antes (CLAUDE.md): «la clave local nunca entra a la base de datos». Para que el usuario no tenga que tocar archivos, la API guardará la clave local de cada enchufe **cifrada** (clave maestra en una variable de entorno del backend, nunca en el repositorio) y se la entregará **solo al agente asignado**, por HTTPS. La app nunca la recibe ni la muestra.
- La clave se obtiene de Tuya Cloud una vez, al registrar el enchufe (una llamada por enchufe: cabe en la cuota).
- El agente se vincula con un **código de 6 dígitos** mostrado en la app y descarga su configuración (lista de enchufes y claves); ya no usa `devices.json` ni `.env` a mano.
- Cambia la regla de «Modelo de datos» y «Seguridad» de CLAUDE.md cuando se implemente el paso 2.

## Plan
1. (hecho) Asignación agente ↔ enchufe, mensajes claros, renombrar y eliminar agentes.
2. Código de vinculación, claves cifradas y configuración automática del agente.
3. Empaquetar el agente: programa instalable o caja dedicada.

## Límites conocidos
- Alguien debe tener el agente corriendo en la misma WiFi que el enchufe: la app del teléfono no puede leerlo de forma fiable (iOS/Android la duermen).
- Al eliminar un agente que sigue conectado, su canal abierto no se cierra hasta que se desconecte; sus lecturas ya se rechazan (token inválido).
- Hoy el agente sigue leyendo `devices.json`: asignar un enchufe en la app no le da la clave; eso lo resuelve el paso 2.
