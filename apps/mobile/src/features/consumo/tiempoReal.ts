import type { QueryClient } from "@tanstack/react-query";

import type { Resumen } from "@/api/tipos";
import type { EventoEnVivo } from "@/realtime/eventos";

const MIN_ENTRE_RECALCULOS_MS = 10_000;
let ultimoRecalculo = 0;

/** Aplica un evento en vivo al resumen guardado (potencia y estado al instante). Los costos los calcula el
 *  backend: se vuelven a pedir como máximo cada 10 s mientras lleguen lecturas. */
export function aplicarEvento(cliente: QueryClient, hogarId: string, evento: Exclude<EventoEnVivo, { tipo: "alerta" }>): void {
  const clave = ["resumen", hogarId];
  cliente.setQueryData<Resumen>(clave, (resumen) => {
    if (!resumen) return resumen;
    return {
      ...resumen,
      dispositivos: resumen.dispositivos.map((d) => {
        if (d.id !== evento.dispositivo_id) return d;
        if (evento.tipo === "estado_enchufe") return { ...d, encendido: evento.encendido };
        return {
          ...d,
          encendido: evento.encendido,
          potencia_w: evento.potencia_w,
          ultima_lectura: evento.fecha_hora,
          en_linea: true,
        };
      }),
    };
  });
  if (evento.tipo === "lectura" && Date.now() - ultimoRecalculo >= MIN_ENTRE_RECALCULOS_MS) {
    ultimoRecalculo = Date.now();
    void cliente.invalidateQueries({ queryKey: clave });
  }
}
