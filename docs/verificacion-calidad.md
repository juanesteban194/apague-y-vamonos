# Verificación de los criterios de calidad (Fase 6)

Estado de cada criterio de calidad del proyecto, con la evidencia y qué falta. **Última revisión: 2026-10-15.**
Leyenda: ✅ verificado · 🟡 verificado en parte · ⏳ pendiente (necesita el enchufe o el teléfono).

| Atributo | Criterio | Estado | Evidencia | Qué falta |
| --- | --- | --- | --- | --- |
| Latencia | Lectura visible en la app ≤ 5 s | ✅ | Con el enchufe real: mín 0,19 s, media 0,25 s, p95 0,35 s, máx 0,44 s ([ADR 0003](decisiones/0003-calculo-de-energia-y-costo.md)); herramienta `tools/04_medir_latencia_ws.py` | Repetir en el ensayo final, con la app en un teléfono |
| Precisión de potencia | Error ≤ 10 % frente a un bombillo incandescente | 🟡 | Escalas confirmadas contra Smart Life ([ADR 0001](decisiones/0001-escalas-data-points-bsd04.md)). **Primera medición real (18-oct): el enchufe leía 48 W y un cabezote marcaba 44 W: error +9,1 %**, dentro del criterio por poco. Se agregó la [calibración](decisiones/0012-calibracion-de-vatios.md) | Calibrar con el cabezote y repetir con un bombillo incandescente de potencia nominal conocida: ver el procedimiento abajo |
| Precisión de costo | Igual a kWh × tarifa vigente | ✅ | El modelo reproduce **al centavo** una factura real de EPM (250 kWh, $202.141,58) en `test_reproduce_una_factura_real_de_epm_al_centavo` ([ADR 0002](decisiones/0002-tarifa-epm-septiembre-2026.md)); la energía en SQL coincide con la integración directa (`test_consolidacion`, `test_energia_costo`) | Comparar una vez en vivo (procedimiento abajo) |
| Alertas | Aviso ≤ 60 s tras cruzar el umbral | ✅ | 15 s medidos; las reglas corren cada 20 s ([ADR 0005](decisiones/0005-fase-4-avisos-control-y-tareas.md)) | Con la app abierta en el teléfono |
| Control remoto | Cambio de estado ≤ 10 s | 🟡 | 0,96 s de la orden a la lectura, medido con el agente simulado ([ADR 0005](decisiones/0005-fase-4-avisos-control-y-tareas.md)); la orden va solo al agente asignado a ese enchufe | Medirlo con el enchufe real y el programa de Mac |
| Continuidad | Sin huecos > 1 min; el agente guarda y reenvía sin internet | ✅ | Con el enchufe real y la API apagada ~35 s: 21 lecturas en 100 s, intervalo máximo 5,0 s, 0 duplicados, cola vacía al final (README del agente); pruebas `test_agente` | Repetir con el programa de Mac y la vinculación nueva |
| Prepago | Proyección con promedio de 3 días; alerta roja < 48 h | ✅ | `tests/test_prepago.py` | — |
| Subsistencia | Alerta al 80 % de 130 kWh | ✅ | `tests/test_alertas.py` (80 % amarillo, 100 % rojo, una vez por mes y nivel) | — |
| Accesibilidad | Texto ≥ 15 px; áreas de toque ≥ 44 px | ✅ | Prueba automática `apps/mobile/__tests__/accesibilidad.test.ts`: ningún `fontSize` < 15, los 16 `Pressable` declaran ≥ 44 px, pestañas de 15 px y 44 px. Comprobé que la prueba falla si se mete un `fontSize: 12` | Mirar en el teléfono que nada se corte con el texto grande del sistema |
| Demo | Ensayo de 30 min sin fallas en Android y iPhone | ⏳ | — | Ensayo completo (ver «Ensayo» abajo) |

## Lo que sí se probó de punta a punta sin el enchufe
- Vincular el agente con un código de 6 dígitos por HTTP real (código de un solo uso, token en un archivo con permisos 600).
- El `.app` de Mac construido arranca, se conecta a la API y pide su configuración.
- Suites: API 294 pruebas, agente 74, app 161 (incluye accesibilidad). Todas pasan.

## Procedimientos que hay que hacer con el hardware

### Precisión de potencia (≤ 10 %)
1. Un bombillo incandescente de potencia **nominal conocida** (por ejemplo 40 o 60 W; el valor está impreso en el bombillo). Voltaje de la casa: ≈ 120 V.
2. Conéctalo al enchufe, déjalo 2 minutos prendido y apúntalo: potencia que muestra la app (o `tools/02_leer_local.py`).
3. Error % = |medida − nominal| / nominal × 100. Un bombillo incandescente real puede gastar algo menos o más que su etiqueta (tolerancia del fabricante ±5 %): si el error sale cerca del 10 %, repite con otro bombillo o compara con el consumo de Smart Life.
4. Anota el resultado aquí abajo.

### Precisión de costo (en vivo)
1. Con el agente corriendo, deja un aparato conocido encendido una hora.
2. Compara el costo de hoy que muestra la app con: potencia media (W) × horas ÷ 1000 × tarifa del estrato (Explorar › Mis casas muestra la tarifa).
3. Deben coincidir salvo redondeo.

### Ensayo de 30 minutos
Android e iPhone con la misma cuenta, el programa de Mac vinculado y un enchufe asignado. Durante 30 minutos, sin tocar la configuración: ver el costo en vivo en los dos teléfonos, prender y apagar el aparato desde cada uno (≤ 10 s), cruzar un umbral de aparato de alto riesgo y ver el aviso (≤ 60 s), cortar el internet del Mac 1 minuto y ver que al volver no quedan huecos. Anota fallas y la hora.

## Resultados medidos con hardware (completar)
| Fecha | Prueba | Resultado |
| --- | --- | --- |
| 2026-10-18 | Potencia: enchufe 48 W vs cabezote 44 W (sin calibrar) | error +9,1 % (cumple ≤ 10 %) |
| — | Potencia tras calibrar con el cabezote | pendiente |
| — | Potencia con bombillo de ___ W | pendiente |
| — | Costo en vivo vs cálculo manual | pendiente |
| 2026-10-18 | Enchufe real → agente (vinculado con código, clave subida desde `devices.json`) → API → app | ✅ «ya lo lee bien» (sin medir tiempos) |
| — | Prender/apagar con enchufe real y programa de Mac | pendiente |
| — | Ensayo de 30 min (Android) | pendiente |
| — | Ensayo de 30 min (iPhone) | pendiente |
