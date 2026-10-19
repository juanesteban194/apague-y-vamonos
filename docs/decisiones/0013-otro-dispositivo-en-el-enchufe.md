# ADR 0013 · Aviso «¿hay otro dispositivo conectado al enchufe?»

**Fecha:** 2026-10-19 · **Estado:** implementado; **umbrales por confirmar con datos reales**

## Problema
Cada enchufe se registra con un dispositivo («Nevera»). Si alguien conecta una multitoma con más cosas, o cambia el dispositivo por otro, la app sigue atribuyendo todo el consumo a «Nevera» y las cuentas dejan de cuadrar. El equipo pidió estimar la corriente habitual de cada dispositivo y avisar cuando la de ahora se salga mucho, por encima o por debajo.

## Decisión
- **Lo normal de un dispositivo** es el rango de su corriente mientras consume, del **percentil 10 al 90**:
  - sale de sus lecturas de los **últimos 7 días**, sin la última hora (para que un cambio reciente no entre en «lo normal»);
  - un rango, y no un promedio, deja pasar la variación propia del dispositivo: el compresor de la nevera, el brillo del televisor.
- **Lo de ahora** es la **mediana de los últimos 15 minutos** consumiendo. Así un pico de segundos no cuenta.
- **Consumiendo** quiere decir encendido y con 30 mA o más. Por debajo, el dispositivo está apagado o en espera y no cuenta.
- **Avisa** (nivel amarillo, «Para revisar»):
  - **por encima** si lo de ahora supera en **40 %** el borde alto de lo normal: «¿Hay algo más conectado al enchufe de Nevera?»;
  - **por debajo** si queda por debajo del **60 %** del borde bajo: «Nevera está usando menos corriente de lo normal».

  En los dos casos la diferencia debe ser de **al menos 0,15 A**, porque en cargas pequeñas, como un cargador, un porcentaje grande es ruido.
- **No avisa mientras aprende:** hacen falta al menos **2 días** y **1 hora** consumiendo.
- **Una vez al día por enchufe.** Respeta la sensibilidad elegida: con «Pocas» no llega, porque es amarillo.
- **Corre cada minuto.** Lo normal se recalcula como mucho una vez por hora, con un caché en memoria.
- **La app** muestra en la pantalla del enchufe la tarjeta **Corriente habitual**: lo normal, lo de ahora y su estado (Aprendiendo, Normal, Más o Menos de lo normal). Ruta: `GET /hogares/{id}/dispositivos/{id}/corriente`.

## Por confirmar
Los umbrales son decisiones de producto, no datos del dominio. Están juntos en `services/api/app/modules/dispositivos/corriente.py`:

| Umbral | Valor |
| --- | --- |
| Margen por encima | 40 % |
| Margen por debajo | 60 % |
| Diferencia mínima | 0,15 A |
| Ventana | 15 min |
| Base | 7 días |
| Mínimo para avisar | 2 días y 1 h consumiendo |

Hay que revisarlos con semanas de datos reales. Casos que pueden dar falsas alarmas:
- la resistencia de descongelado de una nevera;
- una lavadora cuando calienta el agua;
- un portátil cuando termina de cargar.

## Pruebas
`services/api/tests/test_otro_dispositivo.py` (8):
- aprende antes de avisar;
- dentro de lo normal no avisa;
- por encima avisa una vez al día;
- por debajo avisa;
- apagado o un rato corto no avisa;
- en cargas pequeñas no avisa;
- la ruta de la app y su permiso;
- el formato de amperios.

App: `apps/mobile/__tests__/corriente.test.tsx` (4).
