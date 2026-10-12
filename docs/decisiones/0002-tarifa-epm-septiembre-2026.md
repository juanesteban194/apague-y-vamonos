# ADR 0002 — Tarifa EPM residencial de estrato 3 (septiembre de 2026)

Estado: **dato tomado de la publicación oficial; falta confirmar la columna "propiedad" con una factura real.**

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

## Pendiente
- La columna depende de quién es dueño de los activos de conexión del hogar (aparece en la factura). Hasta confirmarlo con una factura real, se asume **Propiedad EPM** solo como valor provisional.
- Se carga por mes en la tabla `tarifas` (Fase 2). Cada mes hay que cargar la nueva publicación y dejar visible el mes en la app.
