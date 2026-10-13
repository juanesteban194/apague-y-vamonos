# HU-04 — Equivalencias y semáforo

Prioridad **media** · Pantalla: Inicio · Módulo: consumo · En la demo: sí

## Criterios de aceptación (decididos por el equipo el 2026-10-13; ver ADR 0006)
- Semáforo contra el promedio de las facturas de EPM: **verde** si el mes proyectado es ≤ promedio, **amarillo** hasta +10 %, **rojo** por encima. Dice cuántos pesos pagaría de menos o de más.
- Sin histórico de facturas (≥ 3 meses) o sin dos lecturas del medidor, no muestra color: dice qué falta.
- Equivalencias: televisor (70 W) y cargar el celular (≈ 15 Wh); Big Mac ($32.900) y caja de leche Colanta de 1 L ($7.500), con fuente en Rappi Medellín (2026-10-13).
- El backend calcula todo; la app solo lo muestra (sin kWh en Inicio).
