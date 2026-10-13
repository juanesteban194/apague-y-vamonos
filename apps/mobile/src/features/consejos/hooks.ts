import { useQuery } from "@tanstack/react-query";

import { obtenerConsejos, obtenerHistorial } from "@/api/cliente";

export function useConsejos(hogarId: string | undefined) {
  return useQuery({ queryKey: ["consejos", hogarId], queryFn: () => obtenerConsejos(hogarId!), enabled: !!hogarId });
}

export function useHistorial(hogarId: string | undefined) {
  return useQuery({ queryKey: ["historial", hogarId], queryFn: () => obtenerHistorial(hogarId!), enabled: !!hogarId });
}
