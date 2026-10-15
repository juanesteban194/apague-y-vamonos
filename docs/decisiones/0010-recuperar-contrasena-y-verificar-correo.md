# ADR 0010 — Recuperar la contraseña y verificar el correo

**Fecha:** 2026-10-15 · **Estado:** implementado y probado con un proveedor simulado; **el envío real necesita la cuenta de Brevo (ver «Activarlo»)**

## Cómo funciona
- **Recuperar:** «¿Olvidaste tu contraseña?» en el login → la persona escribe su correo → recibe un **código de 6 números** → lo escribe con la contraseña nueva. Sin enlaces (no hay que configurar enlaces profundos ni páginas web).
- **Verificar el correo:** al registrarse se envía un código; en Ajustes aparece «Correo sin verificar» con el botón «Verificar mi correo». **No bloquea nada**: sirve para poder recuperar la cuenta. Las cuentas de Google quedan verificadas (Google ya comprobó el correo).
- **Reglas del código:** de un solo uso, vale 15 minutos, se guarda solo su hash, un código nuevo invalida el anterior, se bloquea tras 5 intentos fallidos. Pedirlo: máx. 3 por hora por correo y 10 por hora por origen.
- **No revela quién tiene cuenta:** «olvidé mi contraseña» responde lo mismo exista o no el correo, y un código inválido para un correo inexistente da el mismo mensaje que uno malo.
- **Cambiar la contraseña cierra las demás sesiones:** los tokens llevan una versión de sesión; al restablecer, sube y los tokens viejos (acceso y renovación) dejan de servir. Útil si se perdió un teléfono con la sesión abierta.
- Una cuenta que entraba solo con Google puede ponerse contraseña por este camino (es dueña del correo).

## Envío de correos: Brevo por HTTP
Render gratuito **bloquea el SMTP**, así que el envío va por la API HTTP de Brevo (plan gratuito: 300 correos al día; no exige dominio propio, solo verificar el correo remitente). Código en `app/integrations/correo/cliente.py`. Nunca lanza: si el correo no sale, la respuesta a la persona es la misma y queda una advertencia en el registro del servidor. Sin `BREVO_API_KEY`, no se envía nada. Para desarrollo, `CORREO_CONSOLA=true` escribe el código en el registro (jamás en producción).

## Activarlo (lo hace una persona del equipo, una vez)
1. Crear una cuenta gratuita en brevo.com.
2. En *Senders, domains & dedicated IPs → Senders*, agregar un remitente con un correo del equipo (puede ser un Gmail) y confirmar el correo que Brevo envía.
3. En *SMTP & API → API keys*, crear una clave.
4. En Render → servicio `gestion-consumo-api` → *Environment*, agregar `BREVO_API_KEY` (la clave) y `CORREO_REMITENTE_EMAIL` (el correo verificado en el paso 2); opcional `CORREO_REMITENTE_NOMBRE`. **No pegar la clave en el chat ni en el repositorio.** Se redespliega solo.
5. Probar: en la app, «¿Olvidaste tu contraseña?» con un correo real.
No se agregaron al `render.yaml` para no frenar los despliegues esperando valores.

## Límites conocidos
- Correos de un remitente Gmail pueden caer en «spam» hasta que el remitente tenga reputación; la pantalla avisa que se mire en esa carpeta. Un dominio propio con SPF/DKIM lo mejoraría.
- Los tokens del WebSocket de la app no comprueban la versión de sesión (se comprueban en toda la API REST); un WebSocket ya abierto sigue hasta que se cierre.
- El código de 6 dígitos tiene 1 millón de combinaciones: lo protegen la vigencia, los 5 intentos y los límites de pedido.
