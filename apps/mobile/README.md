# apps/mobile

App Expo SDK 57 (React Native, TypeScript estricto, Expo Router). Ver **App móvil** en [guía del producto](../../docs/guia-del-producto.md).
La app nunca habla con Tuya: solo con la API (REST + WebSocket).

## Correrla (Expo Go, sin compilar nada)
```
cd apps/mobile
cp ../../.env.example .env        # y completa EXPO_PUBLIC_API_URL=https://gestion-consumo-api.onrender.com
npm install
npm start                         # escanea el QR con Expo Go (Android) o la cámara (iPhone)
```
El teléfono y el Mac en la misma WiFi. La API está en la nube: no hay que levantar nada local. Si Render está dormido,
el primer inicio de sesión tarda hasta ~1 min (la pantalla lo avisa). Usuario de demo: ver `.env.demo` (no versionado).
Si Expo Go no abre el proyecto: (1) iPhone: *Ajustes > Expo Go > Red local* activado; (2) el teléfono en la misma WiFi
que el Mac y sin datos móviles; (3) prueba abrir `http://<IP del Mac>:8081` en el navegador del teléfono: debe mostrar un JSON.
Si la red aísla los dispositivos (WiFi de la universidad, invitados), usa `npm run start:tunnel`.
Expo Go no recibe push en Android (los avisos se ven dentro de la app); el push con la app cerrada necesita un *development build* (Fase 7).

## Comandos
- `npm run start:tunnel`: como `start`, pero por un túnel de internet (funciona aunque la WiFi aísle los dispositivos; más lento).
- `npm test`: Jest (formato, cliente con renovación de token, tiempo real, pantallas con API y WebSocket simulados).
- `npm run typecheck`: `tsc --noEmit`.
- `npm run api:types`: regenera `src/api/schema.d.ts` desde el OpenAPI de la API (usa `EXPO_PUBLIC_API_URL`).

## Estructura
`app/` rutas (Expo Router) · `src/api` cliente HTTP, sesión (expo-secure-store) y tipos · `src/realtime` WebSocket con
reconexión · `src/features/consumo` consultas y actualización en vivo · `src/components` · `src/theme` (texto ≥ 15 px,
áreas de toque ≥ 44 px) · `src/lib` formato COP y fechas.
