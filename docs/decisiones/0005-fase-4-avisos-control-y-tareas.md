# ADR 0005 — Fase 4: avisos, control remoto, prepago, rutinas y tareas programadas

## Tareas programadas (APScheduler dentro de la API)
| Cada | Qué | Por qué esa frecuencia |
| --- | --- | --- |
| 20 s | Reglas de avisos (alto riesgo, subsistencia, prepago) | CLAUDE.md pide aviso ≤ 60 s tras cruzar el umbral: con una pasada por minuto el peor caso rozaba los 60 s. Medido: 15 s |
| 1 min | Rutinas que vencen | Tienen 5 min de tolerancia; no necesitan más |
| 1 h (minuto 5) | Consolida `consumo_horario` de las últimas 48 h | Upsert: corrige lecturas que el agente reenvía tarde |
| 1 día (03:10) | Consolida 29 días y purga lecturas crudas de más de 30 días | Primero consolida, después borra, y solo horas completas |
Zona `America/Bogota`. Cada tarea abre su sesión y nunca deja escapar una excepción. En Render gratuito la API duerme sin tráfico; mientras el agente envía
lecturas está despierta. Las consultas leen crudo (últimos 29 días) + consolidado (lo anterior): el total no cambia al purgar.

## Control remoto
`POST /dispositivos/{id}/encender|apagar`. Vía principal: el agente por `WS /ws/agente` (LAN). Respaldo: Tuya Cloud, solo si el agente no está, no responde o
falla; firma HMAC-SHA256, token cacheado (cada comando cuesta 1 llamada) y **tope de 300 llamadas al mes por proceso** para proteger la cuota de 26.000.
Límite de 6 cambios por minuto por enchufe (decisión técnica; sale 429 con un mensaje claro). Medido: orden → lectura con el enchufe apagado en la app: 0,96 s.

## Reglas de avisos (nivel = color del semáforo: rojo / amarillo / verde)
- **Alto riesgo (HU-02):** el aparato está marcado `alto_riesgo`, lleva encendido **y consumiendo** más minutos que su umbral y hay una lectura de hace ≤ 60 s.
  Un aviso por episodio (si se apaga y se vuelve a prender es otro). Incluye cuánto cuesta cada hora si hay tarifa; si no, no inventa el ahorro. Rojo.
- **Subsistencia (HU-07):** amarillo al 80 % y rojo al 100 % de los 130 kWh; una vez por mes y nivel. Con lecturas del medidor usa la diferencia del mes
  (toda la casa); sin ellas usa lo que miden los enchufes y lo dice.
- **Prepago (HU-03):** promedio de los últimos 3 días a partir de la caída del saldo entre anotaciones; las recargas (saldo que sube) se descartan. Con menos
  de 1 día de historia no proyecta (decisión técnica: dos anotaciones seguidas darían un gasto absurdo). Rojo si queda menos de 48 h. Un aviso por anotación.
- **Rutinas fallidas:** amarillo si una rutina no pudo ejecutarse.
- **Cuántos avisos (Pocas / Normales / Muchas = pocos / normal / todos):** pocos solo rojo; normal rojo y amarillo; todos incluye verde.

## Rutinas (HU-08)
Días de la semana (lunes = 0) del **apagado**; hora de apagado y, opcional, de encendido (puede cruzar la medianoche: el encendido de madrugada pertenece al día
anterior). Se ejecuta si ya pasó la hora programada y no han pasado 5 minutos. La ejecución se **reclama** insertando su evento con restricción única
(rutina, acción, horario): aunque la tarea corra dos veces o haya dos procesos, el comando sale una vez. Ahorro estimado = potencia media real de los últimos
7 días × horas apagado × días por semana × 52/12 × precio por kWh; sin hora de encendido, sin tarifa o sin datos, no se inventa.

## Notificaciones
Evento `alerta` por WebSocket (app abierta) + push por Expo Push. El push remoto necesita una compilación propia con proyecto de EAS: en Expo Go (Android) o con
un iPhone de cuenta gratuita no funciona y la app lo detecta y sigue con notificación local mientras está abierta. Si el push está activo no se duplica con la local.
El botón "Apagar" va en la notificación de los avisos de alto riesgo.

## Pendiente (necesita datos o decisiones tuyas)
- **Consumo anómalo** ("la nevera gasta un 18 % más de lo normal", "buena semana"): "lo normal" es el promedio mensual de las facturas de EPM (objetivo del producto); faltan los umbrales por sensibilidad (Fase 5).
- Push con la app cerrada: se movió a la Fase 7 (lanzamiento), junto con la compilación propia, Firebase/FCM y el proyecto de EAS.

## Medido de punta a punta (agente simulado, planificador real)
Aviso de alto riesgo: 15 s después de cruzar el umbral (criterio ≤ 60 s). Apagar: 0,96 s (criterio ≤ 10 s).
