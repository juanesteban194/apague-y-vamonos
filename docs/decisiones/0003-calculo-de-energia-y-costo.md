# ADR 0003 — Cálculo de energía y costo (Fase 2)

Estado: implementado y verificado contra cálculos a mano (`services/api/tests/test_energia_costo.py`, `test_consumo.py`).

## Energía
`E_kWh = (1 / 3.600.000) × Σ (P_i[W] × Δt_i[s])`, calculada en SQL (ventana `LEAD`), no en Python: un mes son ~500.000 filas por enchufe.
- Δt_i es el tiempo hasta la **siguiente** lectura del mismo enchufe: la potencia se mantiene hasta que llega la siguiente.
- Δt_i > 60 s es hueco y no se integra; Δt_i = 60 s sí. La última lectura, sin siguiente, no aporta.
- Un intervalo que cruza el borde de una hora o un día se asigna a la cubeta donde empieza (error ≤ 5 s).
- Zona horaria de "hoy", "semana" y "mes": `America/Bogota` (UTC-5, sin horario de verano).
- `add_ele` (DP 17) no se usa, ver ADR 0001.

## Costo
`Costo = energía × tarifa del estrato y del mes`, con dos bloques (hasta subsistencia y sobre ella).
- El bloque se decide con la **energía medida de todo el hogar** (suma de sus enchufes) en el mes. Los enchufes no miden toda la casa, así que es una aproximación: HU-07 usará `lecturas_medidor` para la línea de subsistencia real.
- Se calcula el costo del mes del hogar por bloques y se obtiene un **precio medio** (COP/kWh) que se aplica a cada enchufe y a cada día. Con consumo bajo la subsistencia, el precio medio es exactamente la tarifa del primer bloque, así que el costo es kWh × tarifa.
- Tarifa del mes: si aún no se carga la del mes actual, se usa la más reciente anterior y la API lo indica (`es_del_mes_actual`), para mostrar el mes en la app. Sin ninguna tarifa, el costo es `null` (no se inventa).
- Dinero en `Decimal`, redondeo a centavos (`ROUND_HALF_UP`).

## Tiempo real
- `WS /ws/hogares/{id}`; el primer mensaje es `{"token": "<acceso>"}` (el token no va en la URL). Cierres: 4401 sin autenticar, 4403 sin acceso al hogar.
- Eventos: `lectura` y `estado_enchufe` (`alerta` llega en la Fase 4). Se publican **después** de responder al agente.
- Solo lo reciente (≤ 60 s) es "en vivo": al reenviar lo acumulado tras una caída no se inunda a la app. Un lote publica solo la última lectura por enchufe.
- Conexiones en memoria de un solo proceso (Render gratuito). Si se escala a varias instancias hará falta un bus (p. ej. Redis).
- El token de acceso se valida al conectar; una conexión abierta no se corta cuando el token vence a los 15 min.

## Prueba de la fase
Retraso lectura del enchufe → evento en la app, en Render (Oregon) con el enchufe real por LAN, 30 lecturas:
mín 0,19 s, media 0,25 s, p95 0,35 s, máx 0,44 s (criterio ≤ 5 s). Mide desde que el agente termina de leer por LAN; no incluye la
frecuencia con la que el propio enchufe actualiza sus medidas.
