# ADR 0011 — El mismo enchufe en varias cuentas (modo de pruebas)

**Fecha:** 2026-10-18 · **Estado:** implementado; **solo para pruebas, apagar antes de abrir la app a otras personas**

## Problema
El equipo tiene **un solo enchufe físico** y varias cuentas de prueba (por ejemplo, la del Android, la del iPhone y la demo). El ID de Tuya era único en todo el sistema, así que solo una cuenta podía registrarlo.

## Qué cambió
1. **El ID de Tuya es único por casa**, no en todo el sistema (`uq_dispositivos_hogar_tuya`). Cualquier cuenta puede registrar el mismo ID. En la misma casa sigue sin poder repetirse («Ese ID de Tuya ya está registrado en esta casa»).
2. **Variable `COMPARTIR_ENCHUFES`** (en `render.yaml` está en `true` para las pruebas; por defecto es `false`). Encendida:
   - **Lecturas:** cuando el agente de una cuenta manda lecturas de un enchufe que le pertenece, la API las copia al enchufe de las demás cuentas que registraron el mismo ID. Cada cuenta recibe sus eventos en vivo con **sus propios** IDs de enchufe. Reenviar no duplica; si el enchufe está asignado a otro agente, no se copia nada.
   - **Prender y apagar:** si la cuenta que toca el botón no tiene agente conectado, la orden va por el agente de otra cuenta que sí lea ese enchufe.
3. Apagada (lo normal), cada cuenta solo ve lo que lee su propio agente y puede registrar el mismo ID pero sin recibir datos.

## Cómo usarlo con un solo enchufe
- **Una sola cuenta corre el agente** (el programa de Mac vinculado a esa cuenta, con el enchufe asignado). Dos agentes leyendo el mismo enchufe se estorban: estos enchufes aceptan pocas conexiones.
- **Las demás cuentas** solo registran el enchufe (Explorar › Enchufes › Conectar un enchufe, con el mismo ID de Tuya) y **no** le asignan agente. Verán las lecturas y podrán prenderlo y apagarlo.
- En esas cuentas la lista de enchufes dice «Sin agente asignado: no llegarán datos» aunque sí lleguen (lo copia la API); es un texto del modo normal, no un fallo.

## Riesgo (por qué es solo para pruebas)
Con el modo encendido, **cualquier persona que registre un ID de Tuya ajeno recibe el consumo de ese enchufe** y puede apagarlo. El ID está impreso en el dispositivo y en Smart Life, y no hay forma de comprobar que el enchufe es de quien lo registra. Mientras todas las cuentas sean del equipo no importa; antes de abrir la app a usuarios reales hay que poner `COMPARTIR_ENCHUFES` en `false` (Render › Environment, o en `render.yaml`).
Para usuarios reales habría que comprobar la propiedad (por ejemplo, vincular su cuenta de Smart Life al proyecto de Tuya).

## Pruebas
`tests/test_enchufe_compartido.py` (13): mismo ID en cuentas y casas distintas, repetido en la misma casa, sin compartir (privacidad), con compartir (copia a 3 cuentas, sin duplicar, eventos en vivo y cambios de estado con los IDs de cada una, agente ajeno, cuenta sin el enchufe), y órdenes por el agente de otra cuenta (con y sin el modo).
