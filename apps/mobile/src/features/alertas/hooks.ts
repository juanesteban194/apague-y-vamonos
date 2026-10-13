import { useQuery } from "@tanstack/react-query";

import { obtenerAlertas, obtenerPreferencias } from "@/api/cliente";

export function useAlertas(hogarId: string | undefined) {
  return useQuery({
    queryKey: ["alertas", hogarId],
    queryFn: () => obtenerAlertas(hogarId!),
    enabled: !!hogarId,
    refetchInterval: 60_000, // además del evento en vivo, por si la conexión se cayó un rato
  });
}

export function usePreferenciasAlertas(hogarId: string | undefined) {
  return useQuery({ queryKey: ["preferencias-alertas", hogarId], queryFn: () => obtenerPreferencias(hogarId!), enabled: !!hogarId });
}
