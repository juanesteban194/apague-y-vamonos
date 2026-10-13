# CLAUDE.md — App de Gestión de Consumo Energético (Reto 2)

Este archivo es el contexto permanente del proyecto. Léelo completo antes de cualquier tarea.
La sección **Tarea actual** dice qué hacer ahora; todo lo demás describe hacia dónde vamos.

---

## Tarea actual — Fases 4 y 5 hechas; sigue la Fase 6 (pruebas y ensayo)

Estado de las fases (detalle y decisiones en `docs/decisiones/`, historias en `docs/historias-usuario/`):

| Fase | Estado |
| --- | --- |
| Andamiaje | Hecha |
| 0 Hardware | Hecha: BSD04 por LAN (protocolo 3.5), escalas confirmadas (ADR 0001) |
| 1 Backend base | Hecha: API en Render + Neon; el agente escribe lecturas en la nube |
| 2 Consumo y tiempo real | Hecha: retraso enchufe → app máx 0,44 s (ADR 0003) |
| 3 App base | Construida (tsc, bundle Android/iOS y 59 pruebas): Inicio, Dispositivo, Mi casa, registro con consentimiento, Google, onboarding. **Falta la prueba en teléfonos reales** ([guía](docs/guia-de-prueba.md)) |
| 5 Consejos y RETIQ | Hecha (ADR 0006): histórico de facturas, semáforo contra el promedio, equivalencias, consejos y simulador de reemplazo con VPN. Precios de Big Mac ($32.900) y caja de leche Colanta ($7.500) cargados desde Rappi Medellín el 2026-10-13; tasa 12 % y 10 años confirmadas por el equipo. Clases RETIQ de neveras: índice Ar (A ≥ 67, B 56–67, C 42–56; Res. 40285/2026, tabla 7.2.4.a) |
| Agente local | Hecho: cola SQLite, reintentos, redescubre IP, canal de comandos y modo simulado |
| 4 Alertas y control | Hecha (ADR 0005): avisos de alto riesgo, subsistencia y prepago; encender/apagar; rutinas; tareas programadas; push. Aviso a los 15 s, Apagar en 0,96 s. El push con la app cerrada se movió a la Fase 7 (lanzamiento); la regla de "consumo normal" se define con el promedio mensual de las facturas de EPM (ver Objetivo del producto) |

Pendiente del usuario: crear el cliente OAuth de Google y poner `GOOGLE_CLIENT_ID/SECRET` en Render; revisar el despliegue en Render; probar la app en Android e iPhone; (hecho) factura de EPM verificada (ADR 0002);
rotar la contraseña de Neon y el Access Secret de Tuya (quedaron expuestos en el chat).

Siguiente: Fase 6 (verificar cada criterio de calidad, ensayo de 30 min, video de respaldo) y Fase 7 (lanzamiento). Falta en las reglas: el aviso de consumo anómalo por aparato ("la nevera gasta 18 % más") y precisión de potencia con bombillo incandescente.

---

## Contexto del proyecto

- Curso: Proyecto de Ingeniería 1, Universidad de Medellín. Reto 2: gestión del consumo energético doméstico.
- Objetivo: app móvil que mide el consumo de electrodomésticos con enchufes inteligentes Tuya, lo traduce a pesos colombianos (tarifa EPM) y a equivalencias cotidianas, avisa consumos anómalos y recomienda acciones, incluido el reemplazo de electrodomésticos según el etiquetado RETIQ.
- Usuarios objetivo: hogares de Medellín (estrato 3, adultos mayores, arrendatarios con medidor prepago, presupuesto ajustado).
- Alcance: **demo funcional para la sustentación**. Sin publicación en Google Play ni App Store.
- Documento fuente de esta arquitectura: https://claude.ai/code/artifact/b2c9ef4f-918a-4afd-abd5-22b2db5c8982

## Objetivo del producto (decisión del equipo, 2026-10-13)
El producto debe ser rentable porque **ayuda a una familia a pagar menos que su promedio mensual según las facturas de EPM**. Por eso:
- "Consumo normal" = el promedio mensual de la factura (el histórico de 6 meses que EPM imprime) y el ahorro se mide contra ese promedio, en pesos.
- El semáforo, los avisos de consumo anómalo y los consejos buscan quedar por debajo de ese promedio.
- Como los enchufes no miden toda la casa, la comparación mensual usa las lecturas del medidor (HU-07).

## Decisiones de arquitectura

| Decisión | Elección | Motivo |
| --- | --- | --- |
| App móvil | React Native + Expo SDK 57, TypeScript | Un solo código para Android e iOS |
| Backend | Python 3.12 + FastAPI | La integración con Tuya ya se probó en Python (`tinytuya`) |
| Base de datos | PostgreSQL (Neon en producción, Docker en local) | Series de tiempo + relaciones |
| Tiempo real | Agente local → API → WebSocket a la app | Cumple el retraso ≤ 5 s sin gastar cuota de Tuya |
| Lectura del enchufe | Agente local por LAN con TinyTuya | La cuota de prueba de Tuya Cloud no alcanza para polling |
| Nube de Tuya | Solo comandos de respaldo y alta de dispositivos | Cuota de prueba: 26.000 llamadas y 68.000 mensajes al mes |
| Fuera de alcance | HU-06 (excedentes solares) | No hay datos de inversor |

El equipo tiene Mac: se usa para el simulador de iOS, compilar e instalar en iPhone con Xcode y correr el agente local en la demo.

## Hardware verificado

- Enchufe: modelo **BSD04** (marca Vii Smart), 100–240 V, máx. 10 A (≈1.100 W a 110 V). No usar con aire acondicionado, plancha ni calentadores.
- App de emparejamiento: Smart Life (ecosistema Tuya).
- Cuenta Smart Life registrada en Colombia → data center **Western America** (AWS Oregon), `apiRegion="us"`, endpoint `openapi.tuyaus.com`.
- Lectura observada en Smart Life con carga: 455 mA, 26,3 W, 127 V, total 0,00 kWh.
- Data points esperados (confirmar escalas en Fase 0, no asumir):
  - Nube: `cur_current` (mA), `cur_power` (probablemente décimas de W), `cur_voltage` (probablemente décimas de V), `add_ele` (energía), `switch_1` (encendido).
  - Local (TinyTuya, protocolo 3.3+): DP 17 energía, DP 18 corriente, DP 19 potencia, DP 20 voltaje.
- La clave local cambia cada vez que el enchufe se vuelve a emparejar en Smart Life.

## Requisitos de calidad (criterios de aceptación)

| Atributo | Criterio | Origen |
| --- | --- | --- |
| Latencia | Lectura visible en la app ≤ 5 s después de medida | HU-01 |
| Precisión de potencia | Error ≤ 10 % frente a carga de referencia (bombillo incandescente) | Meta del equipo |
| Precisión de costo | Igual al cálculo manual kWh × tarifa vigente | HU-01, HU-05 |
| Alertas | Aviso ≤ 60 s después de cruzar el umbral | HU-02 |
| Control remoto | Cambio de estado ≤ 10 s después del toque | HU-02, HU-08 |
| Continuidad | Sin huecos > 1 min; el agente guarda y reenvía sin internet | HU-01 |
| Prepago | Proyección con promedio de 3 días; alerta roja < 48 h | HU-03 |
| Subsistencia | Alerta al 80 % de 130 kWh/mes (Medellín, ≥ 1.000 msnm; Res. UPME 355/2004) | HU-07 |
| Accesibilidad | Texto ≥ 15 px; áreas de toque ≥ 44 px | Mockup |
| Demo | Ensayo de 30 min sin fallas en Android y iPhone | Sustentación |

## Vista general

```
CASA (misma red WiFi)                    NUBE                                  TELÉFONO
┌──────────────────┐   por internet   ┌──────────────┐   ┌──────────────┐
│ Enchufe BSD04    │◄─────────────────│ Tuya Cloud   │   │ PostgreSQL   │
└────────▲─────────┘                  │ (Oregon)     │   │ (Neon)       │
         │ lectura local 5 s          └──────▲───────┘   └──────▲───────┘
         │ y comandos                        │ comandos         │ SQL
┌────────┴─────────┐  HTTPS lecturas  ┌──────┴──────────────────┴───┐   avisos  ┌───────────┐
│ Agente local     │─────────────────►│ API FastAPI (Render)        │──────────►│ Expo Push │
│ (Mac en la demo) │◄─────────────────│ REST + WebSocket            │           │ → FCM     │
└──────────────────┘  WSS comandos    └──────────────▲──────────────┘           └─────┬─────┘
                                                     │ REST + WSS (eventos en vivo)   │ push (Android)
                                              ┌──────┴────────────────────────────────▼───┐
                                              │ App Expo (Android e iOS)                  │
                                              └───────────────────────────────────────────┘
```

Regla de oro: **la app nunca habla con Tuya**. Todo pasa por la API.

## Estructura del repositorio

```
.
├── CLAUDE.md
├── README.md
├── .gitignore
├── .env.example
├── render.yaml                     # Blueprint de Render (Render lo busca en la raíz)
├── docs/
│   ├── decisiones/                 # ADR: una decisión por archivo
│   └── historias-usuario/          # HU-01 … HU-08 con criterios de aceptación
├── apps/
│   └── mobile/                     # App Expo (se inicializa en Fase 3)
│       ├── app/                    # Expo Router: una ruta por archivo
│       │   ├── (auth)/             # login
│       │   ├── (tabs)/             # Inicio, Avisos, Consejos, Mi casa
│       │   └── dispositivo/        # detalle de un enchufe: [id].tsx
│       ├── assets/
│       └── src/
│           ├── api/                # cliente HTTP y tipos generados desde OpenAPI
│           ├── realtime/           # WebSocket y reconexión
│           ├── features/
│           │   ├── consumo/
│           │   ├── dispositivos/
│           │   ├── alertas/
│           │   ├── consejos/       # incluye simulador RETIQ
│           │   ├── prepago/
│           │   └── rutinas/
│           ├── components/         # semáforo, tarjeta de dispositivo, equivalencias
│           ├── theme/              # colores del semáforo, tipografía ≥ 15 px
│           └── lib/                # formato COP, fechas
├── services/
│   ├── api/                        # Backend FastAPI
│   │   ├── app/
│   │   │   ├── core/               # config, base de datos, seguridad
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── hogares/
│   │   │   │   ├── dispositivos/
│   │   │   │   ├── ingesta/
│   │   │   │   ├── consumo/
│   │   │   │   ├── alertas/
│   │   │   │   ├── prepago/
│   │   │   │   ├── rutinas/
│   │   │   │   ├── retiq/
│   │   │   │   └── tarifas/
│   │   │   ├── realtime/           # gestor de conexiones WebSocket
│   │   │   ├── integrations/
│   │   │   │   ├── tuya_cloud/
│   │   │   │   └── expo_push/
│   │   │   └── jobs/               # tareas programadas (APScheduler)
│   │   ├── migrations/             # Alembic
│   │   ├── seeds/                  # tarifas, retiq_referencia, equivalencias
│   │   └── tests/
│   └── agent/                      # Agente local (corre en la casa)
│       ├── agent/
│       │   ├── collector/          # lectura local con TinyTuya
│       │   ├── buffer/             # cola SQLite sin internet
│       │   ├── commands/           # encender/apagar recibidos por WSS
│       │   └── config/             # lee devices.json (gitignored)
│       │   (enviador.py y principal.py: envío a la API y programa principal)
│       ├── tools/                  # scripts de verificación de Fase 0
│       └── tests/
└── infra/
    ├── local/                      # docker-compose con PostgreSQL para desarrollo
    └── render/                     # (el blueprint está en render.yaml, en la raíz)
```

Convención de cada módulo del backend (se crea en Fase 1, no ahora): `router.py`, `schemas.py`, `models.py`, `service.py`.

Al inicializar Expo en la Fase 3, no sobrescribir `apps/mobile/app/`, `src/` ni `assets/`: inicializar en un directorio temporal y mover los archivos generados.

## App móvil

| Necesidad | Librería |
| --- | --- |
| Base | Expo SDK 57 + TypeScript estricto |
| Navegación | Expo Router (pestañas inferiores) |
| Datos del servidor | TanStack Query |
| Estado local | Zustand |
| Tiempo real | WebSocket nativo |
| Notificaciones | expo-notifications (con categoría y botón "Apagar") |
| Credenciales | expo-secure-store |
| Gráficas | Victory Native (react-native-svg) |
| Contrato | openapi-typescript desde el OpenAPI de FastAPI |

Pantallas (del mockup): Inicio, Dispositivo, Avisos, Consejos + RETIQ, Mi casa. Rutinas (HU-08) va como sección de Mi casa.

Reglas de presentación:
- No mostrar kWh salvo en configuración; el consumo se dice en pesos o en equivalencias.
- Costos, semáforo y equivalencias los calcula el backend; la app solo los muestra.
- Texto ≥ 15 px, áreas de toque ≥ 44 px.

Tiempo real: al abrir Inicio se conecta `wss://…/ws/hogares/{id}`. Eventos: `lectura`, `estado_enchufe`, `alerta`. Si cae, reconexión con espera creciente y TanStack Query refresca el resumen cada 30 s.

Notificaciones:
- Android: push por Expo Push → FCM. Desde SDK 53, Expo Go no recibe push en Android: usar *development build*.
- iPhone sin cuenta Apple Developer: la firma gratuita no permite push y el perfil vence a la semana. Alertas dentro de la app y notificación local con la app activa.

## Backend

### Vías hacia el enchufe

| Vía | Uso |
| --- | --- |
| Agente local (TinyTuya por LAN) | Lectura cada 5 s y comandos. Vía principal |
| API de Tuya Cloud | Comandos cuando el agente no responde; alta de dispositivos |
| Mensajes Pulsar | No se usan en la demo (librería sin versiones desde 2021; cuota de mensajes limitada) |

### Módulos

| Módulo | Responsabilidad | HU |
| --- | --- | --- |
| auth | Registro, login, JWT | Todas |
| hogares | Estrato, tipo de medidor, límite de subsistencia, tarifa | HU-01, HU-07 |
| dispositivos | Enchufes, vínculo con ID de Tuya, encender/apagar | HU-01, HU-02 |
| ingesta | Valida y guarda lecturas; las publica por WebSocket | HU-01 |
| consumo | Energía, costo, resúmenes, semáforo, equivalencias | HU-01, HU-04 |
| alertas | Reglas, preferencias, envío de avisos | HU-02, HU-03, HU-07 |
| prepago | Saldo y días restantes | HU-03 |
| rutinas | Horarios de apagado y ahorro estimado | HU-08 |
| retiq | Tabla RETIQ y simulador financiero (VPN, meses de recuperación) | HU-05 |
| tarifas | Tarifa EPM por estrato y mes, carga manual mensual | HU-01, HU-07 |

### Cálculo de energía y costo

```
E_kWh = (1 / 3.600.000) × Σ (P_i[W] × Δt_i[s])
```
- Un intervalo Δt > 60 s es hueco: no se integra.
- Costo = E × tarifa del estrato y del mes (bloque hasta subsistencia y bloque sobre subsistencia).
- `add_ele` del enchufe solo se usa para verificar el total; tiene poca resolución.

### Endpoints

| Método y ruta | Consumidor |
| --- | --- |
| `POST /auth/login` | App |
| `GET /hogares/{id}/resumen` | Inicio |
| `GET /dispositivos/{id}/consumo?periodo=dia\|semana\|mes` | Dispositivo |
| `POST /dispositivos/{id}/encender`, `POST /dispositivos/{id}/apagar` | Dispositivo, notificación |
| `GET /hogares/{id}/alertas`, `PUT /hogares/{id}/preferencias-alertas` | Avisos |
| `GET /hogares/{id}/consejos` | Consejos |
| `POST /simulador/retiq` | Consejos |
| `GET`/`PUT /hogares/{id}/prepago` | Mi casa |
| `GET`/`POST`/`PUT`/`DELETE /hogares/{id}/rutinas` | Mi casa |
| `POST /ingesta/lecturas` | Agente |
| `WS /ws/hogares/{id}` | App |
| `WS /ws/agente` | Agente |

### Tareas programadas (APScheduler en el proceso de la API)

- Cada minuto: evaluar reglas de alertas y ejecutar rutinas que vencen.
- Cada hora: consolidar `consumo_horario`.
- Cada día: recalcular proyección de prepago.

Librerías: FastAPI, Pydantic, SQLAlchemy 2, Alembic, APScheduler, httpx, SDK de Expo Push. Agente: TinyTuya.

## Modelo de datos (PostgreSQL, 17 tablas)

| Tabla | Campos clave |
| --- | --- |
| usuarios | id, email, hash de contraseña, nombre |
| hogares | id, nombre, barrio, estrato, tipo de medidor, límite de subsistencia (kWh/mes, por defecto 130) |
| miembros_hogar | usuario, hogar, rol (titular, familiar) |
| agentes | id, hogar, hash del token, última conexión |
| dispositivos | id, hogar, ID de Tuya, nombre, tipo de aparato, alto riesgo, umbral de minutos encendido |
| lecturas | dispositivo, fecha y hora, potencia (W), voltaje (V), corriente (mA), encendido — PK (dispositivo, fecha y hora) |
| consumo_horario | dispositivo, hora, kWh, costo (COP) |
| lecturas_medidor | hogar, lectura del medidor EPM (kWh), fecha |
| tarifas | estrato, mes, COP/kWh hasta subsistencia, COP/kWh sobre subsistencia, fuente |
| alertas | id, hogar, dispositivo, tipo, nivel, mensaje, fecha, leída |
| preferencias_alertas | hogar, sensibilidad (pocos, normal, todos) |
| tokens_push | usuario, token de Expo, plataforma |
| prepago_saldos | hogar, saldo (COP), fecha de registro |
| rutinas | id, dispositivo, días, hora de apagado, hora de encendido, activa |
| eventos_rutina | rutina, fecha de ejecución, resultado, kWh evitados (estimado) |
| retiq_referencia | categoría, clase (A–G), consumo mínimo y máximo (kWh/mes), fuente |
| equivalencias | nombre, costo (COP), ícono, vigente desde |

Reglas:
- La clave local del enchufe **nunca** entra a la base de datos; vive en `services/agent` (`devices.json`, gitignored).
- Lecturas crudas: retención de 30 días (17.280 filas/día por enchufe). `consumo_horario` se guarda siempre.

## Historias de usuario

| HU | Prioridad | Pantalla | Módulos | En la demo |
| --- | --- | --- | --- | --- |
| HU-01 Consumo por aparato en kWh y COP | Alta | Inicio, Dispositivo | ingesta, consumo, tarifas | Sí |
| HU-02 Aviso de aparato de alto riesgo | Alta | Avisos, notificación | alertas, dispositivos | Sí (push solo Android) |
| HU-05 Simulador de reemplazo RETIQ | Alta | Consejos | retiq | Sí |
| HU-08 Rutinas de apagado | Alta | Mi casa | rutinas, agente | Sí |
| HU-03 Días de saldo prepago | Media | Mi casa | prepago, alertas | Sí |
| HU-04 Equivalencias y semáforo | Media | Inicio | consumo | Sí |
| HU-07 Línea de subsistencia | Media | Inicio, Dispositivo | consumo, alertas | Sí |
| HU-06 Excedentes solares | Baja | — | — | No |

Cobertura parcial: los enchufes no miden toda la casa.
- HU-03 proyecta con la caída del saldo entre registros del usuario.
- HU-07 usa `lecturas_medidor`; sin lectura del medidor, la app muestra solo lo medido y lo indica.
- RETIQ no tiene API pública: `retiq_referencia` se arma a mano con fuente por fila.

## Seguridad

- Access ID y Access Secret de Tuya solo en variables de entorno del backend. Nunca en la app ni en el repositorio.
- Contraseñas con Argon2. JWT de acceso 15 min y renovación 30 días, guardados en expo-secure-store.
- Cada endpoint verifica que el usuario pertenece al hogar.
- El agente usa un token propio por hogar: solo envía lecturas y recibe comandos de su hogar.
- HTTPS y WSS en todo el tráfico. Límite de frecuencia en encender/apagar.
- Consentimiento de tratamiento de datos en el registro (Ley 1581 de 2012).

## Variables de entorno

```
# services/api
DATABASE_URL=
JWT_SECRET=
TUYA_ACCESS_ID=
TUYA_ACCESS_SECRET=
TUYA_REGION=us
EXPO_ACCESS_TOKEN=

# services/agent
AGENT_API_URL=
AGENT_TOKEN=
AGENT_POLL_SECONDS=5

# apps/mobile
EXPO_PUBLIC_API_URL=
```

## Despliegue (demo)

| Componente | Dónde | Vigilar |
| --- | --- | --- |
| API | Render, servicio web gratuito, región Oregon | Se apaga tras 15 min sin tráfico; tope 750 h/mes |
| PostgreSQL | Neon, plan gratuito | 1 GB; despierta en milisegundos. No usar Postgres gratuito de Render (vence a 30 días) |
| Agente | Mac del equipo | Misma red WiFi que el enchufe |
| Push | Expo Push → FCM | Proyecto Firebase |
| Android | APK de development build | — |
| iPhone | Xcode en el Mac, Apple ID gratuito | Perfil vence en 7 días; reinstalar 1–2 días antes |

## Plan de construcción

Cada fase termina con su prueba. No avanzar de fase sin confirmación del usuario.

0. **Verificación del hardware** (`services/agent/tools`): clave local con el asistente de TinyTuya; lectura local cada 5 s.
   Prueba: 10 min de lecturas estables y escalas confirmadas contra Smart Life.
1. **Backend base**: FastAPI, modelos, Alembic, auth, `POST /ingesta/lecturas`, despliegue Render + Neon.
   Prueba: el agente escribe lecturas en la base en la nube.
2. **Consumo y tiempo real**: integración de energía, tarifas, resumen, WebSocket.
   Prueba: retraso medido ≤ 5 s del enchufe al evento WebSocket.
3. **App base**: Expo, navegación, Inicio y Dispositivo con datos reales.
   Prueba: Android y iPhone muestran el mismo costo en vivo.
4. **Alertas y control**: HU-02, HU-03, HU-07, push Android, encender/apagar, rutinas HU-08, y las tareas programadas (APScheduler): consolidar `consumo_horario` cada hora y purgar lecturas crudas de más de 30 días (pendiente de la Fase 2).
   Prueba: el aviso llega y "Apagar" corta la corriente; `consumo_horario` coincide con la integración directa de las lecturas.
5. **Consejos y RETIQ**: simulador HU-05, semáforo y equivalencias HU-04.
   Prueba: el simulador reproduce un cálculo de VPN hecho a mano.
6. **Pruebas y ensayo**: verificar cada criterio de calidad; ensayo de 30 min; video de respaldo.
7. **Detalles para el lanzamiento**: push con la app cerrada (development build de Android con Firebase/FCM y proyecto de EAS; iPhone requiere cuenta de Apple de pago), íconos y pantalla de arranque propios, texto y política de tratamiento de datos, recuperación de contraseña y verificación de correo (servicio de envío de correos), publicación en las tiendas.
   Prueba: el aviso llega con la app cerrada en un Android real.

Riesgo principal: si el BSD04 no responde por red local en la Fase 0, la ingesta cambia. Por eso va primero.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Sin lectura local del enchufe | Probar en Fase 0; respaldo: nube cada 10 min con aviso "dato con retraso" |
| Vence la prueba de IoT Core o se agota la cuota | Comandos por el agente; pedir extensión (hasta 6 meses) en Cloud > My Services |
| Sin push en iPhone | Push en Android; en iPhone aviso dentro de la app |
| WiFi empresarial de la universidad | Hotspot de 2,4 GHz propio |
| Render o Neon dormidos | Despertarlos 2 min antes |
| Error de medición del enchufe | Calibrar con carga de referencia |
| Tarifa EPM desactualizada | Carga mensual; mes de la tarifa visible en Mi casa |
| Varios hogares reales | Fuera de la demo; requiere compartir dispositivos o el SDK de app de Tuya |

## Reglas de trabajo para Claude Code

- Trabajar por fases. Al terminar una fase: mostrar qué cambió, cómo probarlo y esperar confirmación.
- Nombres de dominio en español, igual que el modelo de datos y los endpoints (`hogares`, `lecturas`). Términos técnicos en inglés estándar (`router`, `service`, `schemas`).
- No inventar valores de tarifas, consumos RETIQ ni escalas de data points: pedirlos o dejarlos como dato pendiente.
- Nunca escribir secretos en archivos versionados. Si aparece uno en el código, avisar.
- Cada dato del dominio que no esté en este archivo es una pregunta para el usuario, no una suposición.
