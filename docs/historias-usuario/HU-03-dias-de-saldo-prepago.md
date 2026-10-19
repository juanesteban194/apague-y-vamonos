# HU-03 — Días de saldo prepago

Prioridad **media** · Pantallas: Inicio y Saldo prepago · Módulos: prepago, alertas · En la demo: sí

## Criterios de aceptación (de los requisitos del proyecto)
| Criterio | Meta |
| --- | --- |
| Prepago | Proyección con promedio de 3 días; alerta roja < 48 h |

## Notas
- Cobertura parcial: la proyección usa la caída del saldo entre los registros que hace el usuario (`prepago_saldos`), no el consumo medido.
- La proyección se recalcula cada día (tarea programada, Fase 4).
