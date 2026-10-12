# ADR 0001 — Escalas de los data points del BSD04 (lectura local)

Estado: **confirmado para DP 18, 19 y 20** (Fase 0). DP 17 sin resolver. Precisión ±10 % frente a bombillo incandescente: pendiente (Fase 6).

## Hallazgos (2026-10-11)
- El BSD04 responde por LAN con protocolo **3.5** (3.3 y 3.4 fallan). IP asignada por DHCP: puede cambiar.
- 10 min a 5 s: 120/120 lecturas, intervalo máximo 5,0 s, 0 huecos > 60 s.
- Con conexión persistente el enchufe devuelve solo los DP que cambiaron: el agente debe conservar el último valor de cada DP.

## Escalas (comparadas con Smart Life, carga: cargador, no simultáneas)
| DP | Magnitud | Crudo → unidad | Estado |
| --- | --- | --- | --- |
| 18 | Corriente | 1 = 1 mA | **Confirmada** (ventilador: 221 vs 221 mA) |
| 19 | Potencia | 1 = 0,1 W | **Confirmada** (ventilador: 26,5 vs 26,6 W, 0,4 %) |
| 20 | Voltaje | 1 = 0,1 V | **Confirmada** (128,1 a 128,6 V en ambos) |
| 17 | Energía | — | **Sin resolver**: no es un total acumulado (valió 9 y luego 3). No usar hasta entenderlo |

## Prueba con ventilador (10:01 pm, carga estable)
Smart Life: 221 mA, 26,6 W, 128,1 V. LAN (8 lecturas): DP 18 = 220 a 221, DP 19 = 264 a 265, DP 20 = 1281 a 1286.

## Pendiente
- Error de potencia ≤ 10 % frente a un bombillo incandescente de potencia conocida (Fase 6).
- Comportamiento del DP 17 (¿se reinicia? ¿por intervalo?) frente a "Total (kWh)" de Smart Life.
