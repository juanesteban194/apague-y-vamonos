# «Apague y vámonos»: guía completa del producto

Este documento explica todo el producto **sin suponer que sabes de programación**. Va de lo simple a lo técnico:
1. Qué es y para quién (parte 1).
2. Cómo funciona por dentro, con analogías (partes 2 a 5).
3. El código, las carpetas y las pruebas (partes 6 a 8).
4. El lado empresarial: cómo explicarlo, venderlo y qué falta para escalarlo (partes 9 a 12).

Al final hay un glosario (parte 13). Cada vez que veas una palabra técnica en **negrita** por primera vez, está explicada ahí o en la misma frase.

Fecha de esta versión: 18 de octubre de 2026.

---

## Parte 1. El producto en una página

### El problema
Una familia de Medellín recibe la factura de EPM una vez al mes y solo ve un total: «250 kWh, $202.141». No sabe **qué dispositivo** se lleva la plata, ni si este mes va mejor o peor que lo normal, hasta que ya es tarde. Esto pesa más en:
- hogares de estrato 3 con presupuesto ajustado;
- adultos mayores, a quienes las apps técnicas les resultan difíciles;
- arrendatarios con **medidor prepago**, que se quedan sin luz cuando se acaba el saldo.

### La solución
Un **enchufe inteligente** (un enchufe que se conecta al WiFi y mide cuánta electricidad pasa por él) entre la pared y el dispositivo. La app traduce lo que mide a un idioma que todos entienden:
- **Pesos, no kilovatios:** «La nevera lleva $1.280 hoy».
- **Equivalencias:** «Lo de hoy es como dejar el televisor prendido 21 horas».
- **Un semáforo:** compara el mes con el promedio de tus facturas de EPM: verde (vas por debajo), ámbar (un poco por encima), rojo (por encima).
- **Avisos:** «La lavadora lleva 2 horas prendida» con un botón «Apagar ahora», o «La nevera gastó 18 % más ayer de lo normal».
- **Control:** prender y apagar desde el teléfono, y **rutinas** («apaga el televisor todos los días a las 11:30 p. m.»).
- **Consejos con su ahorro en pesos**, y un **simulador** que dice si te conviene cambiar la nevera vieja por una nueva de mejor etiqueta de eficiencia (**RETIQ**, la etiqueta oficial de Colombia que va de la A a la G).
- **Prepago:** «Al ritmo de los últimos 3 días, tu saldo te alcanza hasta el lunes 26».

### La promesa (el objetivo del negocio)
**Que la familia pague menos que su promedio mensual según sus facturas de EPM.** Todo el producto se mide contra eso: el semáforo, los avisos y los consejos buscan quedar por debajo de ese promedio, y el ahorro se dice en pesos.

### Qué lo hace distinto
- **Habla en pesos y con la tarifa real de EPM**, incluido el bloque de **subsistencia** (los primeros 130 kWh del mes en Medellín tienen subsidio en los estratos 1 a 3; lo que pasa de ahí se cobra más caro). El cálculo reproduce **al centavo** una factura real de EPM.
- **Compara contra tu propia factura**, no contra un promedio genérico.
- **Pensado para personas no técnicas:** letra de 15 px o más, botones de 44 px o más, frases cortas, tuteo, sin jerga.
- **Funciona en tiempo real:** lo que mide el enchufe aparece en la app en menos de medio segundo (medido: 0,44 s como máximo).

---

## Parte 2. Cómo lo vive el usuario (el recorrido)

1. **Crea su cuenta** con correo o con Google, y acepta el tratamiento de datos (lo exige la Ley 1581 de 2012).
2. **Registra su casa:** nombre, barrio, estrato y tipo de medidor (normal o prepago). Puede tener varias casas, por ejemplo la suya y la de su mamá.
3. **Conecta los enchufes** (se emparejan primero en la app Smart Life, la del fabricante) y elige qué dispositivo hay en cada uno.
4. **Vincula el agente:** instala en un computador de la casa el programa «Apague y vámonos» y escribe el código de 6 números que le muestra la app. No hay que configurar nada más.
5. **Anota sus facturas:** los kWh de los últimos 6 meses que vienen impresos en la factura de EPM. Con eso, el semáforo sabe qué es «lo normal».
6. **Usa la app a diario:**
   - **Inicio:** el semáforo, lo gastado hoy, «Ahora mismo» (vatios en uso) y la lista de «Qué está gastando más», con un interruptor por dispositivo.
   - **Explorar:** todo ordenado por categorías, como en una app de banco: Mis dispositivos (Enchufes, Agentes, Rutinas), Mi plata (Facturas y medidor, Saldo prepago), Ahorra (Consejos, Cambiar un dispositivo) y Mi cuenta (Mis casas, Instrucciones, Ayuda al cliente).
   - **Avisos:** lo que se salió de lo normal, con la acción para resolverlo.
   - **Ajustes:** perfil, casas, ayuda, datos personales, cerrar sesión y eliminar la cuenta.

Cada sección tiene una **sugerencia de primera vez** (sale una vez y no vuelve), un botón «?» con la explicación y una pantalla de **Instrucciones** con todos los temas.

---

## Parte 3. Cada función, con sus reglas

| Función | Qué hace | Regla o cifra clave |
| --- | --- | --- |
| Consumo en vivo (HU-01) | Muestra los vatios de ahora y lo gastado hoy, en la semana y en el mes, por dispositivo y para la casa | Lectura cada 5 s; llega a la app en ≤ 0,44 s |
| Semáforo (HU-04) | Proyecta cómo cerrará el mes y lo compara con el promedio de tus facturas | Verde: igual o por debajo del promedio · ámbar: hasta 10 % por encima · rojo: más del 10 % |
| Equivalencias (HU-04) | Traduce lo gastado a cosas cotidianas | Precios reales cargados a mano (por ejemplo, Big Mac $32.900 y leche Colanta $7.500, Rappi Medellín, 13-oct-2026) |
| Aviso de riesgo (HU-02) | Si un dispositivo marcado como de riesgo pasa el tiempo que elegiste prendido, avisa y ofrece «Apagar ahora» | Aviso en ≤ 60 s (medido: 15 s); apagado en ≤ 10 s (medido: 0,96 s) |
| Consumo anómalo | Compara lo que gastó ayer cada dispositivo con su «normal» | Normal = mediana de sus 7 días anteriores. Subida ≥ 10 %, ≥ 20 % o ≥ 50 %, según la sensibilidad elegida |
| Subsistencia (HU-07) | Avisa cuando la casa se acerca a los 130 kWh subsidiados | Aviso al 80 % y al 100 %, una vez por mes; usa las lecturas del medidor de EPM que anota la persona |
| Prepago (HU-03) | Proyecta para cuántos días alcanza el saldo | Promedio de lo gastado en los últimos 3 días; alerta roja si quedan menos de 48 h |
| Rutinas (HU-08) | Apaga (y si quieres, prende) un dispositivo a una hora, ciertos días | Las ejecuta el servidor cada minuto, aunque el teléfono esté apagado |
| Consejos | Recomendaciones con su ahorro estimado al mes | Salen de lo que miden tus enchufes y de tu factura |
| Simulador RETIQ (HU-05) | Dice si conviene cambiar un electrodoméstico | Valor presente neto con tasa del 12 % anual y 10 años de vida útil (confirmados por el equipo) |
| Varias casas | Cada casa con sus enchufes, agente, facturas y avisos | La elegida se recuerda |
| Calibración | Corrige los vatios de un enchufe contra un medidor de referencia | Primera medición real: el enchufe leía 48 W y el medidor 44 W |
| Cuenta | Registro, Google, recuperar contraseña y verificar correo con código, eliminar la cuenta | Códigos de un solo uso que vencen en 15 minutos |
| Ayuda al cliente | Abre WhatsApp o el correo con el mensaje ya empezado | Correo: juanechavarria194@gmail.com; WhatsApp: número pendiente |

---

## Parte 4. La arquitectura, explicada con una analogía

Piensa en un **restaurante**:
- El **enchufe** es la **cocina**: ahí pasa lo que se mide.
- El **agente** es el **mesero** de la casa: va a la cocina cada 5 segundos, anota lo que ve y lo lleva al centro de operaciones. Si la calle está cerrada (no hay internet), guarda las comandas en su libreta y las entrega cuando se abre. También lleva órdenes de vuelta («apaga la nevera»).
- La **API** (el servidor en la nube) es la **administración**: recibe todo, lo archiva, hace las cuentas en pesos, vigila las reglas (avisos y rutinas) y le cuenta en vivo al cliente lo que pasa.
- La **base de datos** es el **archivo**: guarda lecturas, casas, usuarios, facturas y avisos.
- La **app** es la **vitrina** del cliente: solo muestra lo que la administración ya calculó, y le pasa a la administración las órdenes del cliente.

```
CASA (misma WiFi)                         NUBE                                   TELÉFONO
Enchufe BSD04 ──WiFi local──▶ Agente ──HTTPS──▶ API FastAPI (Render) ──REST + WebSocket──▶ App (Android e iPhone)
   ▲                           (Mac)  ◀──WSS───        │        │
   └──── prender / apagar ─────┘     órdenes     PostgreSQL   Correo (Brevo) · Push (Expo) · Google
                                                  (Neon)
```

### Regla de oro: la app nunca habla con el fabricante (Tuya)
Todo pasa por nuestra API. Así:
- las claves del fabricante nunca salen del servidor;
- se puede cambiar de marca de enchufe sin cambiar la app;
- no se gasta la cuota de la nube de Tuya. La versión de prueba trae 26.000 llamadas al mes, que no alcanzan para leer cada 5 s.

### Por qué hay un agente en la casa
El enchufe se puede leer de dos formas:
- **Por la nube de Tuya:** es lenta y tiene cuota.
- **Directo por la red WiFi de la casa (red local):** es inmediata, gratis y sin límite.

El agente hace la segunda. Es el corazón del tiempo real y de la continuidad, porque guarda las lecturas cuando se cae internet.

### El viaje de una lectura (de la pared a tu pantalla en menos de medio segundo)
1. El agente le pregunta al enchufe por la red local: potencia (W), voltaje (V), corriente (mA) y si está prendido.
2. La guarda primero en su **cola** local (un archivo SQLite en el computador) y la envía por **HTTPS** (conexión cifrada) a la API.
3. La API la valida, la guarda en PostgreSQL y la publica por **WebSocket** (una conexión que queda abierta para empujar datos en vivo) a los teléfonos que tienen esa casa abierta.
4. La app actualiza la tarjeta del dispositivo. Si la conexión en vivo se cae, se reconecta con esperas crecientes y, de todos modos, refresca el resumen cada 30 s.

### El viaje de una orden («Apagar ahora»)
1. La app le pide a la API `POST /dispositivos/{id}/apagar`.
2. La API verifica que la persona pertenece a esa casa y busca **el agente asignado a ese enchufe** (cada enchufe lo atiende un solo agente).
3. Le manda la orden por su WebSocket; el agente apaga el enchufe por la red local y confirma.
4. La API avisa a la app el nuevo estado. Medido: 0,96 s de punta a punta. Si el agente no responde, la API puede usar la nube de Tuya como respaldo.

### Tareas que corren solas en el servidor
- **Cada 20 s:** evaluar los avisos.
- **Cada minuto:** ejecutar las rutinas que vencen.
- **Cada hora:** consolidar el consumo por hora y revisar el consumo anómalo.
- **Cada día:** limpiar las lecturas crudas de más de 30 días; el consumo por hora se guarda siempre.

---

## Parte 5. Las tecnologías y por qué se eligieron

| Pieza | Tecnología | En palabras simples | Por qué |
| --- | --- | --- | --- |
| App | **React Native** con **Expo SDK 57** y **TypeScript** | Un solo código que produce la app de Android y la de iPhone | Un equipo pequeño mantiene las dos plataformas |
| Navegación | **Expo Router** | Cada pantalla es un archivo; la carpeta define la ruta | Ordenado y fácil de encontrar |
| Datos en la app | **TanStack Query** y **Zustand** | Piden datos al servidor y los recuerdan; guardan el estado de la app | Menos código y menos errores de sincronización |
| Diseño | Tipografía **Inter**, íconos **Phosphor**, sistema de diseño propio | La letra y los íconos de los productos digitales de referencia | Aspecto premium y consistente |
| Servidor | **Python 3.12** con **FastAPI** | El programa que atiende a la app y al agente | La integración con el enchufe ya se había probado en Python; FastAPI genera la documentación sola (`/docs`) |
| Base de datos | **PostgreSQL** (en **Neon**) | Donde se guarda todo, con tablas relacionadas | Sirve para series de tiempo y para datos relacionados (casas, usuarios, enchufes) |
| Migraciones | **Alembic** | El historial de cambios de la estructura de la base | Cambiar la base sin perder datos |
| Tareas | **APScheduler** | El reloj que dispara avisos y rutinas | Corre dentro del mismo servidor |
| Agente | **Python** con **TinyTuya** y **SQLite** | Lee el enchufe por la red local y guarda sin internet | Gratis, inmediato y sin cuota |
| Programa de Mac | **PyInstaller** con un ícono en la barra de menús | El agente como una app normal, con doble clic | Los usuarios no saben usar una terminal |
| Correo | **Brevo** | Envía los códigos de verificación y de recuperación | Plan gratuito suficiente para la demo |
| Notificaciones | **Expo Push** (por FCM en Android) | Avisos en el teléfono | Integrado con Expo |
| Alojamiento | **Render** (servidor) y **Neon** (base) | Dónde vive el servidor en internet | Planes gratuitos para la demo |

---

## Parte 6. Los datos: qué se guarda

La base tiene **19 tablas**. Una tabla es como una hoja de cálculo con columnas fijas.

| Grupo | Tablas | Qué guardan |
| --- | --- | --- |
| Personas | `usuarios`, `miembros_hogar`, `codigos_correo`, `tokens_push` | Cuenta (correo, contraseña cifrada con Argon2, nombre), a qué casas pertenece y con qué rol, los códigos de verificación y la dirección para notificaciones |
| Casa | `hogares`, `tarifas`, `historial_facturas`, `lecturas_medidor`, `prepago_saldos` | Estrato, tipo de medidor, límite de subsistencia, tarifa de EPM por estrato y mes, los 6 meses de factura, las lecturas del medidor y el saldo prepago |
| Dispositivos | `agentes`, `dispositivos` | Los agentes de la casa (con su token cifrado) y los enchufes: nombre, tipo, si es de riesgo, el agente asignado, la calibración y la clave local **cifrada** |
| Mediciones | `lecturas`, `consumo_horario` | Cada lectura de 5 s (se guarda 30 días; son 17.280 por enchufe al día) y el resumen por hora con su costo (se guarda siempre) |
| Reglas | `alertas`, `preferencias_alertas`, `rutinas`, `eventos_rutina` | Avisos enviados, la sensibilidad elegida, las rutinas y cada vez que se ejecutaron |
| Referencia | `retiq_referencia`, `equivalencias` | La tabla oficial de clases RETIQ, armada a mano con su fuente, y los precios de las equivalencias |

---

## Parte 7. Los cálculos (lo que hace que el producto sea confiable)

### Energía y costo
- **Energía:** se suman potencia × tiempo entre lecturas: `E (kWh) = Σ (P[W] × Δt[s]) / 3.600.000`. Si entre dos lecturas pasan más de 60 s, ese tramo se toma como un hueco y no se cuenta, para no inventar consumo.
- **Costo:** energía × tarifa de EPM del estrato y del mes, en **dos bloques**. En estrato 3, septiembre de 2026, con medidor de propiedad de EPM:
  - hasta 130 kWh: $814,63 por kWh;
  - de 130 kWh en adelante: $958,38 por kWh.
- **Verificación:** una prueba automática reproduce una factura real de EPM (250 kWh, $202.141,58) al centavo.

### Semáforo
Se proyecta el mes según el ritmo que llevas (con las lecturas del medidor que anotas) y se compara con el promedio de los 6 meses de tu factura:
- **Verde:** igual o por debajo del promedio.
- **Ámbar:** hasta 10 % por encima.
- **Rojo:** más del 10 % por encima.

El mensaje dice cuántos pesos pagarías de más o de menos.

### Consumo anómalo
- Cada dispositivo se compara consigo mismo. Su «normal» es la **mediana** de sus 7 días anteriores; la mediana no se tuerce por un día raro, a diferencia del promedio.
- Según la sensibilidad elegida, avisa con subidas de 10 % (Muchas), 20 % (Normales) o 50 % (Pocas).

### Prepago
- Promedio de lo que bajó el saldo en los últimos 3 días.
- Días que quedan = saldo ÷ ese promedio.
- Con menos de 48 h, el aviso pasa a rojo.

### Simulador de reemplazo (RETIQ)
1. **Ahorro al mes** = (kWh al mes del dispositivo actual − kWh al mes del nuevo, según su clase RETIQ) × precio del kWh.
2. **Tiempo de recuperación** = precio del nuevo ÷ ahorro al mes.
3. **Valor presente neto (VPN):** cuánto vale hoy todo el ahorro futuro, menos lo que cuesta el nuevo. Con tasa del 12 % anual y 10 años: `VPN = −precio + Σ ahorro / (1 + i)^m`, para los 120 meses, con `i = 1,12^(1/12) − 1`.
4. **Veredicto:** si el VPN es positivo, «Sí te conviene».

---

## Parte 8. El código, las carpetas y las pruebas

### Tamaño
Unas 14.500 líneas de código propio, sin contar las librerías:
- app: ~8.200;
- servidor: ~5.200;
- agente: ~1.200.

También tiene 33 pantallas, 53 rutas en el servidor, 19 tablas y 12 migraciones.

### Mapa de carpetas
```
.
├── README.md                      Entrada al proyecto
├── render.yaml                    Cómo se despliega el servidor en Render
├── .env.example                   Lista de variables de configuración (sin valores secretos)
├── docs/
│   ├── guia-del-producto.md       Este documento
│   ├── comandos.md                Todos los comandos, en orden
│   ├── diseno.md                  Manual de diseño (voz, color, tipografía, componentes)
│   ├── guia-de-prueba.md          Cómo probar en teléfonos reales
│   ├── verificacion-calidad.md    Cada criterio de calidad con su evidencia
│   ├── decisiones/                12 ADR: cada decisión importante, con su porqué
│   └── historias-usuario/         HU-01 a HU-08 con criterios de aceptación
├── apps/mobile/                   LA APP
│   ├── app/                       Una pantalla por archivo (Expo Router)
│   │   ├── (auth)/                Entrar, crear cuenta, recuperar contraseña
│   │   ├── (onboarding)/          Consentimiento y primera casa
│   │   ├── (tabs)/                Las 4 pestañas: index (Inicio), explorar, avisos, ajustes
│   │   ├── dispositivo/[id].tsx   Detalle de un dispositivo ([id] = cualquier dispositivo)
│   │   └── …                      Enchufes, agentes, rutinas, facturas, prepago, consejos, simulador, soporte…
│   ├── src/
│   │   ├── api/                   Cómo habla con el servidor: sesión, renovación del token, tipos
│   │   ├── realtime/              La conexión en vivo (WebSocket) y su reconexión
│   │   ├── features/              Lógica por tema: consumo, alertas, rutinas, ayuda, casas, soporte…
│   │   ├── components/            Piezas visuales reutilizables (Tarjeta, Boton, TarjetaSemaforo…)
│   │   ├── theme/                 Sistema de diseño: colores, tipografía, espacios, sombras
│   │   └── lib/                   Utilidades: formato de pesos y fechas, vibración, almacén seguro
│   ├── __tests__/                 Pruebas de la app
│   └── scripts/vitrina/           Saca capturas de todas las pantallas con datos de ejemplo
├── services/api/                  EL SERVIDOR
│   ├── app/
│   │   ├── main.py                Arranca el servidor y junta todos los módulos
│   │   ├── core/                  Configuración, base de datos, seguridad, cifrado
│   │   ├── modules/               Un módulo por tema (ver abajo)
│   │   ├── realtime/              Conexiones en vivo con la app y con los agentes
│   │   ├── integrations/          Tuya (nube), Expo Push, correo (Brevo)
│   │   ├── jobs/                  Tareas programadas (avisos, rutinas, consolidación, limpieza)
│   │   └── datos_referencia/      Tarifas y equivalencias que se cargan al arrancar
│   ├── migrations/                Historial de cambios de la base (Alembic)
│   ├── seeds/                     Datos iniciales: tarifas, tabla RETIQ, equivalencias
│   └── tests/                     Pruebas del servidor
├── services/agent/                EL AGENTE DE LA CASA
│   ├── agent/
│   │   ├── collector/             Lee el enchufe por la red local (TinyTuya)
│   │   ├── buffer/                Cola SQLite: guarda sin internet y reenvía
│   │   ├── commands/              Ejecuta prender/apagar que llegan del servidor
│   │   ├── config/                Su configuración (local y descargada del servidor)
│   │   ├── vinculacion.py         Vincular con el código de 6 dígitos
│   │   └── app_mac.py, ui/        El programa de Mac con su ícono en la barra de menús
│   ├── instalador/                Construye el .app de Mac
│   ├── tools/                     Scripts de verificación del hardware (Fase 0)
│   └── tests/                     Pruebas del agente
└── infra/local/                   PostgreSQL local con Docker, para desarrollar
```

### Los módulos del servidor
Cada módulo tiene cuatro archivos con el mismo papel:
- `router.py`: las rutas, es decir, las «puertas» por donde entran las peticiones;
- `schemas.py`: la forma de los datos que entran y salen;
- `models.py`: las tablas;
- `service.py`: la lógica.

| Módulo | Responsabilidad |
| --- | --- |
| `auth` | Registro, entrar, Google, renovar sesión, verificar correo, recuperar contraseña, eliminar cuenta |
| `hogares` | Casas, miembros, estrato, medidor, lecturas del medidor |
| `agentes` | Crear agentes, código de vinculación, configuración remota, claves cifradas |
| `dispositivos` | Enchufes, asignación de agente, calibración, prender y apagar |
| `ingesta` | Recibe las lecturas del agente, las valida y las publica en vivo |
| `consumo` | Energía, costo, resumen de Inicio, semáforo, equivalencias, consejos, histórico de facturas |
| `alertas` | Reglas de avisos (riesgo, anómalo, subsistencia, prepago), sensibilidad, notificaciones |
| `prepago` | Saldo y proyección de días |
| `rutinas` | Horarios de apagado y su ejecución |
| `retiq` | Simulador de reemplazo (VPN) |
| `tarifas` | Tarifa de EPM por estrato y mes |

### Cómo está hecha la app por dentro
- **Rutas por archivos:** `app/(tabs)/avisos.tsx` es la pestaña Avisos. Los paréntesis agrupan pantallas sin cambiar la dirección.
- **Componentes:** piezas como `Tarjeta`, `Boton`, `Texto` o `FilaLista` se usan en todas las pantallas. Así todo se ve igual y un cambio de diseño se hace en un solo lugar.
- **Sistema de diseño** (`src/theme` y `docs/diseno.md`):
  - fondo de papel cálido, tarjetas blancas con borde de un pelo y sombra suave;
  - la tinta casi negra es para la acción principal;
  - el semáforo es el único color vivo;
  - letra Inter, íconos Phosphor de trazo fino y vibraciones suaves.
- **La app no calcula plata:** costos, semáforo y equivalencias vienen del servidor. Así el número es el mismo en Android, en iPhone y en la factura.
- **Sesión segura:** el token se guarda en el almacén cifrado del teléfono (`expo-secure-store`) y se renueva solo.

### Las pruebas (qué son y qué cubren)
Una **prueba automática** es un pequeño programa que usa el código y revisa que el resultado sea el esperado, por ejemplo: «con esta factura, el costo debe dar $202.141,58». Se corren en segundos cada vez que se cambia algo y avisan si se rompió una función que ya andaba.

| Parte | Cuántas | Qué revisan, por ejemplo |
| --- | --- | --- |
| Servidor | 376 | Factura real al centavo; cada nivel de cada aviso; rutinas; prepago y sus 48 h; seguridad (nadie ve casas ajenas); vinculación con código; cifrado; correos; simulador contra un cálculo a mano |
| Agente | 79 | Cola sin internet sin duplicados, reintentos, lectura del enchufe, órdenes, vinculación, programa de Mac |
| App | 239 | Pantallas con el servidor simulado, renovación de sesión, tiempo real, textos, formato de pesos, y una prueba de **accesibilidad** que falla si un texto baja de 15 px o un botón de 44 px |

Además están las **mediciones con el enchufe real** (en `docs/verificacion-calidad.md`):

| Criterio | Meta | Medido |
| --- | --- | --- |
| Latencia | ≤ 5 s | 0,44 s como máximo |
| Avisos | ≤ 60 s | 15 s |
| Control | ≤ 10 s | 0,96 s |
| Continuidad | Sin huecos, aunque se caiga la API | 0 duplicados |
| Costo | Al centavo | Al centavo |

Falta la precisión de potencia con un bombillo incandescente y el ensayo de 30 minutos en teléfonos.

La **vitrina** (`npm run vitrina`) saca fotos de las 33 pantallas con datos de ejemplo, para revisar el diseño sin teléfono.

### Las decisiones documentadas (ADR)
Cada decisión importante tiene un archivo en `docs/decisiones/` con el problema, las opciones y por qué se eligió una:
- escalas del enchufe;
- tarifa de EPM;
- cálculo de energía;
- la app;
- avisos y control;
- semáforo y RETIQ;
- consumo anómalo;
- agente por enchufe y clave cifrada;
- datos personales;
- recuperar contraseña;
- mismo enchufe en varias cuentas (modo de pruebas);
- calibración.

Es lo primero que un profesional querrá ver: muestra que las decisiones se pensaron.

---

## Parte 9. Seguridad y datos personales

- **Contraseñas:** nunca se guardan tal cual, solo un resumen irreversible (Argon2, el estándar recomendado hoy).
- **Sesión:** un pase temporal (JWT) que dura 15 minutos y se renueva solo hasta 30 días. Si recuperas la contraseña con el código del correo, se cierran todas las sesiones abiertas (por ejemplo, la de un teléfono perdido).
- **Cada petición verifica** que la persona pertenece a esa casa. Hay pruebas automáticas que intentan ver casas ajenas y deben fallar.
- **El agente** tiene su propio token: solo puede enviar lecturas y recibir órdenes de sus enchufes.
- **La clave local de cada enchufe** se guarda **cifrada** (Fernet, con una clave maestra que solo existe en el servidor) y solo la recibe el agente asignado. Nunca llega a la app.
- **Todo viaja cifrado** (HTTPS y WSS), y prender y apagar tiene límite de frecuencia.
- **Ley 1581 de 2012 (habeas data):**
  - consentimiento explícito al registrarse;
  - política de tratamiento de datos dentro de la app;
  - derecho de supresión con «Eliminar mi cuenta y mis datos».

  La política es un **borrador**: falta la revisión de un abogado.
- **Secretos:** ninguno está en el repositorio. Las claves de Tuya, de la base y de correo viven en variables de entorno del servidor.

---

## Parte 10. Despliegue y costos de operación hoy

| Componente | Dónde | Costo hoy | Límite a vigilar |
| --- | --- | --- | --- |
| Servidor | Render, plan gratuito, Oregon | $0 | Se duerme tras 15 min sin tráfico (el primer ingreso tarda hasta ~1 min); 750 h al mes |
| Base de datos | Neon, plan gratuito | $0 | 1 GB |
| Correo | Brevo, plan gratuito | $0 | Límite diario de envíos del plan |
| Nube de Tuya | Plan de prueba de IoT Core | $0 | 26.000 llamadas y 68.000 mensajes al mes; la prueba vence |
| Agente | Un computador de la casa (Mac en la demo) | El del usuario | Debe estar prendido y en la misma WiFi |
| Android | Expo Go o una compilación propia | $0 | Push con la app cerrada requiere compilación propia y Firebase |
| iPhone | Xcode con Apple ID gratuito | $0 | La instalación vence a los 7 días; push requiere la cuenta de pago de Apple (US$99 al año) |

Para un producto con clientes reales habría que pasar a planes pagos: el servidor sin dormirse, más espacio en la base y la licencia comercial de Tuya. Sus precios no están en este documento: hay que cotizarlos.

---

## Parte 11. Límites honestos y riesgos

Un profesional valora que conozcas los límites de tu producto. Estos son los de hoy:

| Límite | Por qué importa | Cómo se maneja o se resolvería |
| --- | --- | --- |
| Los enchufes no miden toda la casa | La comparación mensual necesita el total | El semáforo usa las lecturas del medidor de EPM que anota la persona; sin ellas, la app dice que solo cuenta lo medido |
| Enchufe de máximo 10 A (≈ 1.100 W) | No sirve para aire acondicionado, plancha ni calentadores | Elegir los dispositivos adecuados; a futuro, medidores de circuito |
| El agente necesita un computador prendido | Muchas casas no dejan un computador encendido | Hoy hay programa para Mac. Siguiente: Windows, o un aparatito dedicado (por ejemplo una Raspberry Pi) |
| Cuota y vencimiento de la nube de Tuya | Sin ella no hay alta de dispositivos ni respaldo de órdenes | Lectura y órdenes van por el agente; pedir extensión o licencia comercial |
| La clave local cambia al re-emparejar el enchufe en Smart Life | Se pierde la lectura hasta actualizarla | Hay que volver a cargar la clave nueva (una vez por enchufe) |
| Push con la app cerrada | Hoy los avisos se ven con la app abierta | Fase 7: compilación de Android con Firebase; iPhone requiere cuenta de pago |
| Tarifa de EPM manual | Cambia cada mes | Carga mensual; el mes de la tarifa se ve en Mis casas |
| Modo de pruebas encendido (`COMPARTIR_ENCHUFES`) | Deja ver el mismo enchufe desde varias cuentas, útil con un solo enchufe | **Apagarlo antes de abrir la app a otras personas** |
| Secretos expuestos en conversaciones | Riesgo de acceso indebido | Rotar la contraseña de Neon, el secreto de Tuya y el token del agente |
| Política de datos en borrador | Requisito legal para operar | Revisión de un abogado |

---

## Parte 12. El lado empresarial

Esta parte distingue lo que **está comprobado** (✔) de lo que son **hipótesis por validar** (◇). No hay cifras de mercado inventadas: donde falta un dato, se dice.

### Propuesta de valor (en una frase)
> «Te decimos en pesos qué dispositivo se lleva tu plata y te ayudamos a pagar menos que tu promedio de EPM.»

### Para quién (segmentos)
- ✔ **Hogares de estrato 3 de Medellín** con presupuesto ajustado: el usuario para el que se diseñó.
- ✔ **Arrendatarios con medidor prepago:** les importa saber cuántos días les dura el saldo.
- ✔ **Adultos mayores y sus familias:** la app es legible y alguien de la familia puede gestionar varias casas («Apartamento de mamá»).
- ◇ **Arrendadores** con varios apartamentos, **pequeños negocios** (tiendas con neveras) y **empresas de energía o fintech** que quieran ofrecerlo a sus clientes.

### Pitch de 30 segundos
> «En Medellín, una familia ve su consumo de luz una vez al mes, cuando ya no puede hacer nada. Nosotros ponemos un enchufe inteligente de bajo costo entre la pared y la nevera, y nuestra app le dice en pesos y en tiempo real cuánto gasta cada dispositivo, con la tarifa real de EPM. Un semáforo le muestra si va por encima de su promedio, le avisa cuando algo gasta de más y le deja apagarlo desde el teléfono. El objetivo es simple: que pague menos que su promedio de siempre.»

### Modelos de negocio posibles (◇ todos por validar con clientes)
| Modelo | Cómo cobra | A favor | En contra |
| --- | --- | --- | --- |
| Kit + suscripción | Se vende el kit de enchufes y una mensualidad baja por la app | Ingreso recurrente | Hay que demostrar que el ahorro supera la mensualidad |
| Freemium | La app básica es gratis; se pagan avisos avanzados, varias casas o el simulador | Adopción rápida | Pocos pagan |
| Alianza B2B2C | Una empresa (de energía, banco o aseguradora) lo ofrece a sus clientes y nos paga por usuario | Llega a muchos sin costo de adquisición | Ciclos de venta largos |
| Arrendadores | Por apartamento gestionado | Un cliente trae varias casas | Mercado más pequeño |

**El argumento de venta es el ahorro en pesos**, y el producto ya lo mide contra la factura. Lo primero por validar es cuánto ahorran de verdad las familias en un piloto.

### Costos por cliente (qué hay que cotizar)
Componentes del costo:
- los enchufes: el modelo BSD04 de Vii Smart soporta máximo 10 A;
- el agente: un computador que ya tienen o un dispositivo dedicado;
- el servidor y la base por usuario;
- el correo y las notificaciones;
- el soporte.

**Dato pendiente:** el precio de compra de los enchufes y los precios de los planes pagos. Sin ellos no se puede calcular el margen.

### Competencia (◇ por investigar)
- La app del fabricante (Smart Life) muestra vatios y kWh, pero no pesos con la tarifa de EPM, ni la comparación con tu factura, ni consejos en pesos.
- Hay que revisar qué ofrecen hoy EPM y otras comercializadoras en sus apps, y los medidores inteligentes de toda la casa.

### Métricas para un piloto (lo que pediría un inversionista)
- **Ahorro real:** pesos por debajo del promedio de las facturas, por familia y por mes. Es la métrica estrella.
- **Uso:** cuántas familias abren la app cada semana y cuántas siguen activas a los 30 días.
- **Acción:** avisos que terminan en «Apagar ahora», rutinas creadas y consejos seguidos.
- **Confianza:** quejas por datos que no cuadran con la factura.

### Hoja de ruta para escalar
1. **Cerrar la demo** (Fase 6): precisión con bombillo, ensayo de 30 min y video.
2. **Lanzamiento** (Fase 7):
   - push con la app cerrada;
   - publicación en Google Play y App Store;
   - política de datos revisada;
   - apagar el modo de pruebas;
   - rotar los secretos.
3. **Agente sin computador:** Windows, o un dispositivo dedicado de bajo costo.
4. **Alta de enchufes sin Smart Life:** con el SDK de app de Tuya o un fabricante aliado.
5. **Tarifas automáticas** por comercializadora y ciudad.
6. **Piloto** con 10 a 30 familias para medir el ahorro real.

### Qué falta para poder venderlo
- Revisión legal: política de datos y términos de uso. Registro de bases de datos ante la SIC si aplica: verificarlo con un abogado.
- Licencia comercial de la nube de Tuya o un acuerdo con el fabricante.
- Infraestructura paga y monitoreo.
- Soporte al cliente: ya hay canal de correo; falta el número de WhatsApp.
- Resultados de un piloto.

---

## Parte 13. Cómo hablar con un profesional

### Preguntas que te van a hacer y cómo responderlas
- **«¿Por qué no leen el enchufe desde la nube del fabricante?»**
  Porque la cuota de la nube no alcanza para leer cada 5 s y sería lento. Por eso un agente local lo lee por la WiFi de la casa, gratis y en menos de medio segundo. La nube queda de respaldo para las órdenes.
- **«¿Qué pasa si se cae internet?»**
  El agente guarda las lecturas en una cola local y las reenvía cuando vuelve, sin duplicados. Se probó apagando la API.
- **«¿Cómo saben que el costo es correcto?»**
  Reproducimos al centavo una factura real de EPM con la tarifa oficial y sus dos bloques; hay una prueba automática que lo vigila.
- **«¿Y la seguridad?»**
  - Argon2 para contraseñas y JWT de 15 minutos.
  - Cada petición verifica la casa.
  - Clave local cifrada que solo recibe el agente asignado.
  - Todo por HTTPS.
  - Ningún secreto en el código.
- **«¿Escala?»**
  La base sí: es PostgreSQL, las lecturas crudas se limpian a los 30 días y el consumo por hora queda resumido. Para escalar hay que cambiar tres cosas:
  - los planes gratuitos;
  - las tareas programadas, que hoy corren dentro del mismo servidor y deberían pasar a un proceso aparte cuando haya varios servidores;
  - el agente, que hoy depende de un computador.
- **«¿Por qué React Native y no apps nativas?»**
  Un solo código para Android e iPhone, con un equipo pequeño.
- **«¿Cómo prueban?»**
  - 694 pruebas automáticas: 376 del servidor, 79 del agente y 239 de la app, incluida una de accesibilidad.
  - Mediciones reales contra cada criterio de calidad.
  - Una vitrina de capturas para el diseño.
- **«¿Cuál es el modelo de negocio?»**
  Responde con la tabla de la parte 12 y di con honestidad que se valida con un piloto midiendo el ahorro real.

### Guion de una demo de 5 minutos
1. **Inicio:** el semáforo en ámbar («Vas medio alto»), lo gastado hoy en pesos y una equivalencia.
2. **Tiempo real:** prende una lámpara en el enchufe y mira cómo sube «Ahora mismo» en menos de un segundo.
3. **Apaga** el dispositivo desde la tarjeta de Inicio y escucha el clic del enchufe.
4. **Avisos:** «La lavadora lleva 2 horas prendida» y «Apagar ahora».
5. **Consejos:** «Podrías ahorrar unos $11.900 al mes» y el simulador de la nevera, con «Sí te conviene».
6. **Prepago:** «Te alcanza hasta el lunes 26».
7. **Cierre:** «Todo esto busca que pagues menos que tu promedio de EPM».

Antes de la demo, despierta el servidor de Render 2 minutos antes. Si la WiFi de la universidad aísla los dispositivos, usa un hotspot de 2,4 GHz propio.

---

## Parte 14. Glosario

| Palabra | Qué significa |
| --- | --- |
| **ADR** | Registro de una decisión de arquitectura: qué se decidió y por qué |
| **Agente** | Programa en un computador de la casa que lee los enchufes por la WiFi y ejecuta órdenes |
| **API** | El servidor al que se conectan la app y el agente; sus «puertas» se llaman rutas o endpoints |
| **Argon2** | Método para guardar contraseñas de forma irreversible |
| **Backend / frontend** | El servidor (lo que no se ve) / la app (lo que se ve) |
| **Base de datos** | Donde se guarda todo, en tablas |
| **Cifrado** | Convertir un dato en algo ilegible sin la clave |
| **Cola** | Lista de lecturas guardadas que esperan ser enviadas |
| **Despliegue** | Publicar el servidor en internet |
| **Enchufe inteligente** | Enchufe con WiFi que mide la electricidad y se puede prender o apagar a distancia |
| **Equivalencia** | Traducir pesos a algo cotidiano («como cargar el celular 340 veces») |
| **Expo / React Native** | Herramientas para hacer una sola app que funciona en Android e iPhone |
| **HTTPS / WSS** | Conexiones cifradas: la normal y la que queda abierta para datos en vivo |
| **JWT (token)** | Un pase temporal que demuestra que ya iniciaste sesión |
| **kWh** | Kilovatio hora: la unidad en que cobra EPM (1.000 W durante una hora) |
| **Mediana** | El valor del medio de una lista ordenada; no se afecta por un dato raro |
| **Migración** | Un cambio ordenado en la estructura de la base de datos |
| **Prepago** | Medidor en el que se compra la energía por adelantado |
| **Push** | Notificación que llega al teléfono |
| **Red local (LAN)** | La red WiFi de la casa |
| **RETIQ** | Reglamento Técnico de Etiquetado de Colombia: la etiqueta de eficiencia de A (mejor) a G |
| **Subsistencia** | Los primeros 130 kWh del mes en Medellín, subsidiados en los estratos 1 a 3 |
| **Tuya** | El fabricante de la plataforma de los enchufes (app Smart Life) |
| **Vatio (W)** | Potencia: cuánta energía usa un dispositivo en este momento |
| **VPN** | Valor presente neto: cuánto vale hoy un ahorro futuro, menos la inversión |
| **WebSocket** | Conexión que queda abierta para que el servidor empuje datos en vivo |

---

## Dónde seguir leyendo
- Comandos para correr todo: [comandos.md](comandos.md)
- Decisiones con su porqué: [decisiones/](decisiones/)
- Historias de usuario: [historias-usuario/](historias-usuario/)
- Verificación de calidad: [verificacion-calidad.md](verificacion-calidad.md)
- Manual de diseño: [diseno.md](diseno.md)
