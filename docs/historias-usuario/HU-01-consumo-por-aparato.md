# HU-01 — Consumo por aparato en kWh y COP

Prioridad **alta** · Pantallas: Inicio, Dispositivo · Módulos: ingesta, consumo, tarifas · En la demo: sí

## Criterios de aceptación (de los requisitos del proyecto)
| Criterio | Meta | Estado |
| --- | --- | --- |
| Latencia | Lectura visible en la app ≤ 5 s después de medida | Medido: máx 0,44 s (ADR 0003) |
| Precisión de costo | Igual al cálculo manual kWh × tarifa vigente | Verificado a mano en pruebas |
| Continuidad | Sin huecos > 1 min; el agente guarda y reenvía sin internet | Medido: intervalo máx 5,0 s con la API apagada ~35 s |
| Precisión de potencia | Error ≤ 10 % frente a carga de referencia | Pendiente: bombillo incandescente (Fase 6) |

## Notas
- La tarifa EPM sale de la tabla `tarifas` (ADR 0002); sin tarifa el costo es nulo, no se inventa.
- **A confirmar con el equipo:** el título dice "kWh y COP", pero la regla de presentación dice que no se muestran kWh salvo en configuración.
  Hoy la API entrega ambos y la app muestra solo pesos.
