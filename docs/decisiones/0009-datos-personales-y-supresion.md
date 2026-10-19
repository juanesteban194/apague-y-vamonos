# ADR 0009 — Tratamiento de datos personales y derecho de supresión

**Fecha:** 2026-10-15 · **Estado:** implementado; **texto de la política en borrador, por revisar por el equipo**

## Qué se hizo
- **Política de tratamiento de datos** (Ley 1581 de 2012 y Decreto 1377 de 2013) como pantalla de la app (`app/politica.tsx`, texto en `src/features/datos/politica.ts`). Se puede leer **antes** de crear la cuenta (enlace en el registro y en la pantalla de consentimiento) y desde Ajustes. Cubre: responsable, datos tratados, finalidades, terceros y transmisión fuera de Colombia, tiempo de conservación, derechos, seguridad, canal de consultas y reclamos, queja ante la SIC.
- **Derecho de supresión:** `DELETE /auth/yo` («Ajustes › Eliminar mi cuenta»). Borra la cuenta; las casas donde la persona era la única miembro se borran con todo lo suyo (enchufes, lecturas, agentes, avisos, facturas, rutinas); en una casa compartida solo sale la persona y otro miembro queda de titular. Las cuentas con contraseña la confirman. Corta los canales de los agentes de las casas borradas. Quien aún no aceptó el tratamiento de datos también puede borrar su cuenta.
- Ya existían: consentimiento obligatorio en el registro, borrar una casa, borrar lecturas del medidor, corregir los datos de la casa.

## Lo que el texto afirma y de dónde sale (para revisarlo)
| Afirmación | Fuente |
| --- | --- |
| Contraseñas con Argon2, HTTPS, claves de enchufes cifradas | Requisitos de seguridad, ADR 0008 |
| Lecturas detalladas 30 días, resumen por hora siempre | Modelo de datos, tarea diaria de purga |
| Servidores fuera de Colombia | Render (Oregón) y Neon; la región exacta de Neon no está en el repositorio |
| Terceros: servidor y base, notificaciones, Google, Tuya | Despliegue y arquitectura |
| No se venden datos ni hay publicidad | Decisión del producto (no hay nada de eso en el código) |

## Pendiente (decisión del equipo; no se inventa)
1. ~~Correo de contacto~~ (resuelto 2026-10-15): `juanechavarria194@gmail.com`, en `CONTACTO.correo` de `politica.ts`. Es el correo personal de un integrante: si el equipo prefiere uno del proyecto, se cambia en ese archivo.
2. **Quién es el responsable.** Hoy: «Equipo del proyecto «Apague y vámonos» (Proyecto de Ingeniería 1, Universidad de Medellín)». Si la universidad o una persona jurídica asumirá ese papel, hay que cambiarlo y, si aplica, agregar dirección y NIT.
3. **Revisión legal** del texto (esto es un borrador, no asesoría jurídica) y, si se publica en tiendas, un enlace a una versión web de la política.
4. Confirmar si los proveedores guardan copias de seguridad de los datos borrados y por cuánto tiempo (el texto no lo afirma).
5. «Descargar mis datos» (portabilidad): no existe; la ley no la exige, pero el derecho de acceso hoy se cumple mostrando los datos en la app.

## Íconos
Ícono propio (rayo ⚡ en la paleta de la app) generado por `apps/mobile/scripts/generar-iconos.js` con `pngjs`, sin herramientas externas: ícono de la app, ícono adaptable de Android (fondo, primer plano y monocromático), pantalla de arranque (crema con rayo verde), favicon y el ícono del programa de Mac (`services/agent/instalador/Apague.icns`). Son un punto de partida: un diseñador puede reemplazar los PNG sin tocar el código.
