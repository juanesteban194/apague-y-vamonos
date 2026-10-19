import { useQuery } from "@tanstack/react-query";

import { obtenerConsumo, obtenerResumen } from "@/api/cliente";
import type { Periodo } from "@/api/tipos";

/** El resumen se refresca cada 30 s (requisitos del proyecto); el tiempo real lo mantiene al día entre refrescos. */
export const REFRESCO_MS = 30_000;

export function useResumen(hogarId: string | undefined) {
  return useQuery({
    queryKey: ["resumen", hogarId],
    queryFn: () => obtenerResumen(hogarId!),
    enabled: !!hogarId,
    refetchInterval: REFRESCO_MS,
  });
}

export function useConsumo(dispositivoId: string, periodo: Periodo) {
  return useQuery({
    queryKey: ["consumo", dispositivoId, periodo],
    queryFn: () => obtenerConsumo(dispositivoId, periodo),
    refetchInterval: REFRESCO_MS,
  });
}
