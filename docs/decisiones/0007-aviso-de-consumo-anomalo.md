# ADR 0007 — Aviso de consumo anómalo por aparato

**Fecha:** 2026-10-15 · **Estado:** implementado; umbrales pendientes de confirmar por el equipo

## Qué hace
Una vez al día, por aparato, la API compara lo que gastó **ayer** (día completo, hora de Bogotá) con lo **normal** de ese aparato y avisa si subió:
«La nevera gastó 18 % más ayer de lo normal. Si sigue así, le cuesta unos $X más al mes.»

## Decisiones
- **Lo normal de un aparato** es la **mediana** de sus 7 días anteriores a ayer (no el promedio: un día raro no la tuerce). Cada aparato se compara consigo mismo.
  El promedio de las facturas de EPM (Objetivo del producto) sigue siendo la vara del semáforo de la casa; los enchufes no miden toda la casa, así que no sirve para un aparato suelto.
- **Sin historia no hay aviso:** hacen falta al menos 3 días con consumo real (≥ 50 Wh) en esos 7. Un día con el aparato casi apagado no cuenta.
- **Solo subidas.** Gastar menos no es un problema. Una subida de menos de 50 Wh al día se ignora aunque en porcentaje parezca grande.
- **Niveles y sensibilidad** (reusa «Pocas / Normales / Muchas» de Avisos): subida ≥ 50 % rojo (llega con Pocas), ≥ 20 % amarillo (Normales), ≥ 10 % verde (solo Muchas).
- **Dinero:** el costo extra al mes es `subida diaria × 30 × precio del kWh del mes`. Se dice en pesos, nunca en kWh.
- **Cuándo corre:** tarea de cada hora (consulta 8 días por aparato: no va con las reglas de cada 20 s). Un solo aviso por aparato y día.
- No lleva botón «Apagar»: un aparato que gasta más no es un riesgo inmediato como uno de alto riesgo encendido.

## Pendiente (decisión del equipo)
Los umbrales (10 / 20 / 50 %), los 7 días de base y los 3 mínimos son decisiones de producto mías, no datos del dominio; están juntos en `app/modules/alertas/anomalias.py`.
Si el equipo tiene un criterio distinto (por ejemplo medir contra el mismo día de la semana), se cambia ahí.

## Cómo se probó
13 pruebas (`tests/test_anomalias.py`): cada nivel, sin tarifa, subida pequeña, gastar menos, poca historia, días apagados, un día raro, un solo aviso al día, sensibilidad, comparación entre aparatos y la tarea horaria.
En la demo real hacen falta unos 4 días de datos con el agente corriendo para que el aviso pueda salir.
