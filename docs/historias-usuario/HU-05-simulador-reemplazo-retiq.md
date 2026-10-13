# HU-05 — Simulador de reemplazo RETIQ

Prioridad **alta** · Pantalla: Consejos · Módulo: retiq · En la demo: sí

## Criterios de aceptación (de CLAUDE.md)
| Criterio | Meta |
| --- | --- |
| Precisión de costo | Igual al cálculo manual kWh × tarifa vigente |
| Prueba de la Fase 5 | El simulador reproduce un cálculo de VPN hecho a mano |

## Notas
- Simulador: ahorro mensual, meses de recuperación y VPN (`POST /simulador/retiq`). El consumo actual lo mide el enchufe; el del aparato nuevo es el kWh/mes de su etiqueta RETIQ.
- La norma RETIQ no trae tablas de kWh por clase (ADR 0006): `retiq_referencia` queda vacía hasta conseguir los anexos oficiales.
- Verificado: el VPN coincide con la suma mes a mes hecha a mano.

## Por definir
Confirmar la tasa de descuento (hoy 12 % anual, editable) y los años de vida útil (hoy 10, editable).
