# HU-08 — Rutinas de apagado

Prioridad **alta** · Pantalla: Explorar › Rutinas · Módulos: rutinas, agente · En la demo: sí

## Criterios de aceptación (de CLAUDE.md)
| Criterio | Meta |
| --- | --- |
| Control remoto | Cambio de estado ≤ 10 s después del toque |

## Notas
- CRUD en `/hogares/{id}/rutinas`; cada minuto se ejecutan las rutinas que vencen (tarea programada, Fase 4) y el agente aplica el comando por LAN.
- Datos: días, hora de apagado, hora de encendido, activa; cada ejecución se registra con el ahorro estimado en kWh (`eventos_rutina`).
