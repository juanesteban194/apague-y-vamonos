# ADR 0001 — Escalas de los data points del BSD04 (lectura local)

Estado: **confirmado** (Fase 0): DP 18, 19 y 20 por dos fuentes independientes (Smart Life y el mapeo oficial de Tuya). DP 17 explicado (energía incremental, ver abajo). Precisión ±10 % frente a bombillo incandescente: pendiente (Fase 6).

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
| 17 | Energía | 1 = 0,001 kWh (`add_ele`, escala 3) | **Incremental, no acumulado**: valió 9 y luego 3 (= 0,009 y 0,003 kWh); la nube de Tuya los suma y por eso Smart Life muestra 0,02 kWh de total. No se usa |

## Mapeo oficial de Tuya (descargado por el asistente, campo `mapping` de devices.json)
`switch_1` (DP1, booleano) · `add_ele` (DP17, kWh, escala 3) · `cur_current` (DP18, mA, escala 0) · `cur_power` (DP19, W, escala 1) ·
`cur_voltage` (DP20, V, escala 1) · DP22–25 `voltage_coe`, `electric_coe`, `power_coe`, `electricity_coe` (coeficientes de calibración del medidor) ·
DP26 `fault` (ov_cr, ov_vol, ov_pwr, ls_vol) · DP38 `relay_status` · DP40 `child_lock` · DP51 `overcharge_switch`.
Confirma las tres escalas medidas. Lo de que `add_ele` sea incremental sale de su nombre y de lo observado; no se verificó sumando
incrementos contra la integración de potencia. `devices.json` guarda la versión del protocolo como `version` (3.5).

## Prueba con ventilador (10:01 pm, carga estable)
Smart Life: 221 mA, 26,6 W, 128,1 V. LAN (8 lecturas): DP 18 = 220 a 221, DP 19 = 264 a 265, DP 20 = 1281 a 1286.

## Pendiente
- Error de potencia ≤ 10 % frente a un bombillo incandescente de potencia conocida (Fase 6).
- Opcional: verificar `add_ele` sumando sus incrementos durante una carga larga y comparándolos con la integración de potencia.
