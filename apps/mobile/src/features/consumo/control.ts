import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { apagarDispositivo, encenderDispositivo, ErrorApi } from "@/api/cliente";

import { aplicarEvento } from "./tiempoReal";

/** Prender y apagar un dispositivo desde la app (lo usan el interruptor de la tarjeta de Inicio y el de la pantalla del dispositivo).
 *  La orden pasa por la API, que la manda al agente que lee ese enchufe. Mientras el agente confirma con una lectura nueva, se
 *  muestra lo que la API acaba de lograr. */
export function useControlDispositivo(hogarId: string | undefined, dispositivoId: string) {
  const cliente = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(encender: boolean) {
    if (enviando) return;
    setError(null);
    setEnviando(true);
    try {
      const r = await (encender ? encenderDispositivo(dispositivoId) : apagarDispositivo(dispositivoId));
      if (hogarId) aplicarEvento(cliente, hogarId, { tipo: "estado_enchufe", dispositivo_id: dispositivoId, encendido: r.encendido, fecha_hora: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : `No se pudo ${encender ? "prender" : "apagar"} el dispositivo.`);
    } finally {
      setEnviando(false);
    }
  }

  return { enviando, error, cambiar };
}
