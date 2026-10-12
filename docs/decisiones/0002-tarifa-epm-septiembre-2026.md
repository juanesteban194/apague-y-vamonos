# ADR 0002 — Tarifa EPM residencial de estrato 3 (septiembre de 2026)

Estado: **tarifa tomada de la publicación oficial y modelo de cálculo verificado con una factura real de EPM (junio de 2026).** La columna "propiedad" se confirma por inferencia (ver abajo).

## Fuente
EPM, *Tarifas y Costo de Energía Eléctrica - Mercado Regulado - septiembre de 2026* (publicación del 16 de septiembre de 2026), mercado Antioquia, Nivel I (< 1 kV).
PDF: https://www.epm.com.co/content/dam/epm/clientes-y-usuarios/energia/tarifas-energia/Tarifas%202026/9.PublicacionTarifasSeptiembre162026_ANT_OM.pdf
Página índice: https://www.epm.com.co/clientesyusuarios/energia/tarifas-energia/
Consultada el 2026-10-11. Es la última publicada; la de octubre sale a mediados de mes.

## Estrato 3 ($/kWh)
| Rango | Propiedad EPM | Compartido | Propiedad Cliente |
| --- | --- | --- | --- |
| 0 – consumo de subsistencia (CS) | 814,63 | 787,79 | 760,95 |
| > CS | 958,38 | 926,81 | 895,23 |

Consumo de subsistencia (CS): **130 kWh/mes** a alturas ≥ 1.000 msnm (Medellín); 173 kWh/mes por debajo. Coincide con `CLAUDE.md`.

## Otros estratos (columna Propiedad EPM, $/kWh)
| Estrato | 0 – CS | > CS |
| --- | --- | --- |
| 1 | 425,51 | 958,38 |
| 2 | 531,88 | 958,38 |
| 4 | 958,38 | 958,38 (todo el consumo) |
| 5 y 6 | 1.150,06 | 1.150,06 (todo el consumo) |

Se cargan con `services/api/seeds/tarifas.py`.

## Verificación con una factura real (junio de 2026, estrato 3, 250 kWh)
Factura aportada por el equipo (no se versiona: trae datos personales de terceros). Solo se usan los valores de energía:
- Energía: 250 kWh × $876,970 (costo unitario, CU) = $219.242,50; subsidio −$17.100,92; **total energía $202.141,58**.
- Subsidio = 130 kWh × 15 % × CU = $17.100,92 → **el consumo de subsistencia es 130 kWh y el subsidio de estrato 3 es 15 %**. En la publicación de
  septiembre pasa igual: 814,63 / 958,38 = 85 %.
- Componentes del CU: generación 305,38 + transmisión 38,46 + distribución 321,26 + comercialización 119,44 + pérdidas 61,71 + restricciones 30,72 = 876,97.
- El cálculo del backend (toda la energía al CU menos el subsidio de los kWh dentro del límite, cada concepto redondeado a centavos) **reproduce
  $202.141,58 al centavo** (`test_reproduce_una_factura_real_de_epm_al_centavo`).
- **Columna de propiedad:** la factura no la nombra, pero su costo de distribución (321,26) es del orden de la columna *Propiedad EPM* de la
  publicación (310,79 en septiembre) y no de *Compartido* (279,21) ni *Cliente* (247,64). Se mantiene **Propiedad EPM**. Si algún hogar
  tiene otra, habrá que cargar su tarifa aparte.
- La factura es de La Ceja (≥ 1.000 msnm, mismo mercado EPM Antioquia): confirma el límite de 130 kWh.

## Pendiente
- Cada mes hay que cargar la nueva publicación (`seeds/tarifas.py`) y dejar visible el mes en la app.
- Cargar también la tarifa de junio u otros meses no es necesario para la demo.
