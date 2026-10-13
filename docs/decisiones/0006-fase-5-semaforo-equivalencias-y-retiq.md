# ADR 0006 — Fase 5: semáforo, equivalencias, consejos y simulador RETIQ

Objetivo del producto (CLAUDE.md): que la familia **pague menos que su promedio mensual de las facturas de EPM**. Todo lo de esta fase gira en torno a ese número.

## "Lo normal" = el promedio de la factura
La persona anota los 6 meses del cuadro "Histórico de consumos" de su factura (`PUT /hogares/{id}/historial-consumo`, kWh y, opcional, lo pagado). El promedio son los 6 meses
más recientes y **se verificó contra una factura real de EPM: 179 kWh, igual al "PROM" que imprime**. Con menos de 3 meses no hay promedio (decisión técnica: un mes raro lo movería demasiado).

## Semáforo (decisión del equipo, 2026-10-13)
Proyecta el mes con el ritmo del **medidor** (lectura base y última lectura del mes): `consumo / días transcurridos × días del mes`. Los enchufes no sirven aquí porque no miden toda la casa.
Verde ≤ promedio · amarillo hasta +10 % · rojo por encima. El mensaje dice cuántos pesos pagaría de menos o de más (con la tarifa vigente y sus dos bloques). Si falta el histórico
o la lectura del medidor, **no inventa un color**: dice qué falta y lleva a anotarlo.

## Equivalencias
Aprobadas: televisor (70 W, del mockup) y cargar el celular (≈ 15 Wh por carga, aproximado). **Hamburguesa y caja de leche están apagadas hasta tener su precio**: no se encontró una
fuente confiable en pesos (solo cifras de otros años o en dólares). Para activarlas basta cargar `costo_cop` y la fuente en la tabla `equivalencias`. Se muestran de a dos, rotando por día,
solo si dan al menos una unidad entera. Se calculan sobre lo que miden los enchufes hoy.

## Simulador de reemplazo (HU-05)
La norma RETIQ (Res. 41012 de 2015, modificada por la Res. 40285 de 2026, vigente desde el 25-dic-2026) **no trae tablas de kWh por clase A–G**: están en anexos técnicos y varían con la capacidad.
No se inventó esa tabla (`retiq_referencia` queda vacía). El simulador usa datos reales: el consumo actual **lo mide el enchufe**, el del aparato nuevo es el kWh/mes de **su etiqueta RETIQ**, y la persona pone el precio.
Ahorro = diferencia de kWh × precio marginal (el de después de la subsistencia si el hogar ya la pasó; si no, el subsidiado). Meses de recuperación = precio / ahorro mensual.
VPN = −precio + Σ ahorro mensual / (1 + i_m)^m, i_m = (1 + tasa)^(1/12) − 1; verificado contra la suma mes a mes hecha a mano.
**Supuestos pendientes de confirmar por el equipo:** tasa de descuento de 12 % anual y 10 años de vida útil son valores iniciales de la app (editables y mostrados); la API no tiene valores por defecto.

## Consejos (`GET /hogares/{id}/consejos`)
Salen de los datos, no de reglas genéricas con cifras inventadas: (1) lo que falta para poder comparar con el promedio, (2) "va por encima de su promedio", (3) el aparato que más gasta con su
porcentaje, (4) rutina de apagado nocturno con el ahorro **medido** de 11 p. m. a 5 a. m. (mínimo $1.000 al mes; **nunca para neveras, congeladores o frigobares**), (5) comparar un aparato cubierto por RETIQ con uno nuevo.
Se necesitan al menos 2 días de datos para extrapolar a un mes.

## Pendiente
- (Resuelto 2026-10-13) Big Mac $32.900 y caja de leche Colanta 1 L $7.500, de Rappi Medellín; son precios de domicilio y pueden ser mayores a los del local. Actualizar a mano en la tabla `equivalencias` cuando cambien. Tasa 12 % y 10 años confirmadas por el equipo.
- Clases RETIQ de neveras (Res. 40285/2026, tabla 7.2.4.a, igual a la de 2020): se miden con el ahorro relativo Ar, no en kWh/mes. A ≥ 67; B 56–67; C 42–56. Vigente desde el 26-dic-2026. Solo informativo; el cálculo usa kWh reales.
- Confirmar tasa y años del simulador.
- Cargar tablas RETIQ solo si el equipo consigue los anexos oficiales con fuente.
