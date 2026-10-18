# Manual de diseño — «Apague y vámonos»

La referencia es una app de producto de primer nivel (Apple Salud y Wallet, Linear, Revolut, Nubank): **mucho aire, una jerarquía clara (una cifra protagonista por pantalla), color con moderación y textos que se leen solos**. Elegante sin ser fría: es para familias de Medellín, incluidos adultos mayores.

El sistema vive en código: `src/theme/index.ts` (tokens), `src/components/Texto.tsx`, `Tarjeta.tsx`, `Boton.tsx`, `Campo.tsx`, `Pantalla.tsx`, `PantallaCompleta.tsx`, `Primitivos.tsx` (EncabezadoSeccion, FilaLista, Pastilla, IconoEnCaja, Separador), `Icono.tsx` y `src/lib/haptica.ts`. **Úsalos siempre en vez de estilos sueltos.**

## 1. Voz y tono
- **Tutea siempre** («tu casa», «toca», «anota»). Nunca «usted».
- Frases cortas, una idea por frase, palabras de todos los días. Nada de jerga técnica: no «API», «token», «data point», «LAN». «kWh» solo donde el dato lo exige (facturas, medidor, simulador).
- **«Dispositivo»**, nunca «aparato». «Enchufe» para el enchufe inteligente. «Casa», no «hogar».
- **Títulos** y **botones** en estilo oración (solo la primera mayúscula), sin punto final. Botones con verbo: «Anotar mis facturas», «Conectar un enchufe».
- Frases completas con punto final. Cifras con formato colombiano: `$3.740`, `1.180 W`, `18 %`.
- **¿?** solo en preguntas reales. **¡!** solo para celebrar un logro, como mucho una vez por pantalla.
- Comillas latinas «».
- Los errores dicen qué pasó y qué hacer: «No pudimos guardar. Revisa tu conexión e intenta de nuevo.».
- Ánimo sin regaño: «Vas medio alto» es mejor que «Estás gastando demasiado».

## 2. Color
- Fondo `colores.fondo` (papel cálido); contenido en `Tarjeta` blanca.
- La tinta (`colores.primario`) es para la acción principal. **El semáforo es el único color vivo**: verde, ámbar y rojo, con sus fondos suaves (`verdeFondo`, `ambarFondo`, `rojoFondo`) y sus tintas oscuras para texto (`verde`, `ambar`, `rojo`).
- Superficie oscura (`Tarjeta variante="oscura"`) solo para **una** protagonista por pantalla, por ejemplo «Vale la pena pensarlo» del simulador.
- No inventes colores. Si de verdad hace falta uno nuevo, justifícalo en el informe.

## 3. Tipografía (Inter)
| Variante | Uso |
| --- | --- |
| `cifra` (44) | La cifra protagonista de la pantalla (el costo de hoy) |
| `cifraMedia` (30) | Cifras importantes secundarias |
| `tituloGrande` (32) | Título de la pantalla (o `Pantalla titulo=…`) |
| `titulo` (24) | Título de una tarjeta protagonista |
| `subtitulo` (18) | Títulos de sección y de tarjeta |
| `cuerpo` (16) | Texto normal |
| `secundario` (15) | Detalles, ayudas, fechas |
| `etiqueta` (15) | Etiqueta corta en color de acento sobre un título («Vas medio alto»). Sin mayúsculas sostenidas |

- Pesos: 400, 500, 600 y 700. **Nunca 800 ni 900.** Menos negrita se ve más fino: títulos 600 o 700, texto 400, énfasis 500 o 600.
- **Ningún texto por debajo de 15 px** (criterio de accesibilidad; una prueba lo vigila).
- Las cifras usan números tabulares (ya incluido en `cifra` y `cifraMedia`).

## 4. Forma, espacio y profundidad
- Márgenes laterales de 20 (los pone `Pantalla`). Espacio entre bloques de 16 a 24; dentro de una tarjeta, 8 a 12.
- Radios: controles `radios.m` (14), tarjetas `radios.l` (20), protagonistas `radios.xl` (28).
- **Bordes de un pelo** (`BORDE_FINO`) y color `colores.borde`. Nada de bordes de 2 px.
- Sombras con `sombras.suave` (ya incluida en `Tarjeta`); `media` solo para protagonistas y `flotante` para lo que flota.
- **Listas** como en los Ajustes de iOS: `Tarjeta style={{ padding: 0, gap: 0 }}` con `FilaLista` y `Separador sangria={66}` entre filas.
- Íconos: `Icono` (por significado, nunca el glifo directo) y `IconoEnCaja` para darles fondo suave. Sin emojis.

## 5. Componentes y patrones
- **Un solo botón primario por pantalla.** Lo demás: `secundario` (relleno suave), `contorno`, `texto` (acciones menores), `peligro` (borrar o eliminar).
- **Estados de un vistazo** con `Pastilla` («Conectado», «Ahorra unos $9.800 al mes»).
- **Vacíos:** ícono en caja, un título, una línea de explicación y una acción.
- **Cargando:** texto discreto o esqueleto; nunca una pantalla en blanco.
- **Vibración** (`@/lib/haptica`): `seleccionar()` al cambiar un interruptor o una opción, `exito()` al guardar algo importante, `aviso()` en advertencias. No en cada toque.

## 6. Reglas técnicas (no negociables)
- Texto ≥ 15 px y áreas de toque ≥ 44 px. Cada `<Pressable` declara `minHeight` (o `AREA_TOQUE_MIN`) en sus primeras 16 líneas: lo revisa `__tests__/accesibilidad.test.ts`.
- Conserva `accessibilityRole`, `accessibilityLabel` y `accessibilityState`: las pruebas y los lectores de pantalla dependen de ellos.
- **No cambies la lógica**: llamadas a la API, rutas de navegación, cálculos ni datos. Es un cambio de presentación y de textos.
- Costos, semáforo y equivalencias los calcula el backend; la app solo los muestra (puede sumar y ordenar lo que ya viene, por ejemplo los vatios de ahora).
- Nada de `expo-notifications` directo (usa `notificacionesSeguras`).
- `npx tsc --noEmit` y `npx jest` deben pasar. Si cambias un texto, actualiza la prueba que lo busca.

## 7. Cómo verlo: la vitrina
```
cd apps/mobile
npm run vitrina:servidor                      # la app en web con datos de ejemplo (déjala corriendo)
npm run vitrina -- /tmp/capturas inicio avisos # capturas 390×844 a 2× de esas pantallas (sin nombres: todas)
```
Cada pantalla sale como `<nombre>.png` (lo que se ve sin desplazarse) y `<nombre>-completa.png`. Los datos de ejemplo están en `scripts/vitrina/datos.mjs`; las pantallas y sus rutas, en `scripts/vitrina/capturar.mjs`.
Es una aproximación web: la fuente, los colores, los espacios y la composición son fieles; la sombra y el desplazamiento pueden variar un poco en el teléfono.
