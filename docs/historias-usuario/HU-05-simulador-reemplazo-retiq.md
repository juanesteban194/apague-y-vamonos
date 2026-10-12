# HU-05 — Simulador de reemplazo RETIQ

Prioridad **alta** · Pantalla: Consejos · Módulo: retiq · En la demo: sí

## Criterios de aceptación (de CLAUDE.md)
| Criterio | Meta |
| --- | --- |
| Precisión de costo | Igual al cálculo manual kWh × tarifa vigente |
| Prueba de la Fase 5 | El simulador reproduce un cálculo de VPN hecho a mano |

## Notas
- Simulador financiero: VPN y meses de recuperación (`POST /simulador/retiq`).
- RETIQ no tiene API pública: `retiq_referencia` se arma a mano, con la fuente en cada fila (categoría, clase A–G, consumo mínimo y máximo en kWh/mes).

## Por definir
Los datos de la tabla RETIQ, la tasa de descuento y el horizonte del VPN. No se inventan consumos RETIQ.
