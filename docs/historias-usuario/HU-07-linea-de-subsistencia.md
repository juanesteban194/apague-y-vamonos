# HU-07 — Línea de subsistencia

Prioridad **media** · Pantallas: Inicio, Dispositivo · Módulos: consumo, alertas · En la demo: sí

## Criterios de aceptación (de CLAUDE.md)
| Criterio | Meta |
| --- | --- |
| Subsistencia | Alerta al 80 % de 130 kWh/mes (Medellín, ≥ 1.000 msnm; Res. UPME 355/2004) |

## Notas
- El límite vive en `hogares.limite_subsistencia_kwh` (130 por defecto) y ya define el bloque de tarifa (ADR 0003).
- Cobertura parcial: usa `lecturas_medidor` (lectura del medidor EPM). Sin lectura del medidor, la app muestra solo lo medido y lo indica.
