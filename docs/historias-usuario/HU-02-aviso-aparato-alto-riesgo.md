# HU-02 — Aviso de aparato de alto riesgo

Prioridad **alta** · Pantallas: Avisos, notificación · Módulos: alertas, dispositivos · En la demo: sí (push solo en Android)

## Criterios de aceptación (de CLAUDE.md)
| Criterio | Meta |
| --- | --- |
| Alertas | Aviso ≤ 60 s después de cruzar el umbral |
| Control remoto | Cambio de estado ≤ 10 s después del toque |
| Prueba de la Fase 4 | El aviso llega y "Apagar" corta la corriente |

## Datos del modelo
`dispositivos.alto_riesgo` y `umbral_minutos_encendido`; alertas con tipo, nivel, mensaje y fecha; preferencias de sensibilidad (pocos, normal, todos).
Notificación con categoría y botón "Apagar". En iPhone sin cuenta Apple Developer: aviso dentro de la app y notificación local con la app activa.

## Por definir
Qué aparatos cuentan como de alto riesgo y sus umbrales (el enchufe no debe usarse con aire acondicionado, plancha ni calentadores), y los textos y niveles de las alertas.
