import { useQuery } from "@tanstack/react-query";

import { listarLecturasMedidor, obtenerPrepago } from "@/api/cliente";

export function usePrepago(hogarId: string | undefined) {
  return useQuery({ queryKey: ["prepago", hogarId], queryFn: () => obtenerPrepago(hogarId!), enabled: !!hogarId });
}

export function useLecturasMedidor(hogarId: string | undefined) {
  return useQuery({ queryKey: ["lecturas-medidor", hogarId], queryFn: () => listarLecturasMedidor(hogarId!), enabled: !!hogarId });
}
