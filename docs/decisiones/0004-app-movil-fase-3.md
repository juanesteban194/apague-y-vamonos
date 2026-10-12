# ADR 0004 — App móvil, Fase 3

## Decisiones
- **Expo Go para la Fase 3.** Inicio y Dispositivo no necesitan módulos nativos propios, así que se prueban en Android e iPhone con Expo Go,
  sin Xcode ni Android Studio. El *development build* (push en Android) llega en la Fase 4.
- **Tiempo real.** Al abrir la app se conecta `wss://…/ws/hogares/{id}`; el token va en el primer mensaje (ADR 0003). Reconexión con
  espera creciente (1 s … 30 s, con algo de azar), `ping` cada 25 s, y se cierra en segundo plano. Los eventos `lectura` y
  `estado_enchufe` actualizan potencia y estado al instante; **los costos los calcula el backend**: un evento `lectura` provoca como
  máximo un nuevo `GET /resumen` cada 10 s, y el resumen se refresca cada 30 s (CLAUDE.md).
- **Costo en vivo.** Android e iPhone piden el mismo resumen, así que difieren a lo sumo por el instante del último refresco. Si en la
  Fase 6 hace falta que sean idénticos al centavo, el backend deberá enviar el costo dentro del evento `lectura`.
- **Sesión.** Tokens en `expo-secure-store`. El de acceso se renueva solo (30 s antes de vencer o ante un 401), una sola vez a la vez;
  si la renovación es rechazada se cierra la sesión.
- **Presentación.** Sin kWh en Inicio ni Dispositivo (solo pesos y vatios); la tarifa en $/kWh solo aparece en Mi casa. "Dato con
  retraso" cuando la última lectura tiene más de 60 s; "Con la tarifa de <mes>" cuando falta cargar la del mes actual; sin tarifa no
  se inventan costos.
- **Tipos.** `src/api/schema.d.ts` se genera del OpenAPI con `openapi-typescript`, ejecutado con `npx` y no instalado, porque su
  *peer dependency* pide TypeScript 5 y el proyecto usa 6. Los eventos del WebSocket no están en el OpenAPI y se escriben a mano
  (`src/realtime/eventos.ts`).
- **Gráfico.** Victory Native 36 (versión con react-native-svg, como indica CLAUDE.md). Se comprobó que renderiza con React 19 en las
  pruebas; si en un dispositivo diera problemas, el componente `BarrasConsumo` está aislado para cambiarlo.
- **Rutas.** `app/` en la raíz de `apps/mobile` (no `src/app`), como define la estructura del repositorio.

## Fuera de esta fase
Registro de usuarios desde la app (el backend ya lo permite; hoy se entra con un usuario creado por la API), Avisos, Consejos,
Prepago y Rutinas (marcadores de posición), encender/apagar (Fase 4), semáforo y equivalencias (Fase 5). Íconos y splash son los de
la plantilla de Expo.

## Verificación hecha sin dispositivo
`tsc` estricto sin errores; `expo export` para Android e iOS (Hermes) y `expo-doctor` 21/21; 29 pruebas de Jest. **Falta la prueba de la
fase en dispositivos reales**: Android e iPhone mostrando el mismo costo en vivo.
