import { useQuery } from "@tanstack/react-query";

import { obtenerHogares, obtenerTarifa } from "./cliente";

/** Por ahora cada usuario trabaja con su primer hogar. */
export function useHogarActual() {
  const consulta = useQuery({ queryKey: ["hogares"], queryFn: obtenerHogares });
  return { ...consulta, hogar: consulta.data?.[0] };
}

export function useTarifa(hogarId: string | undefined) {
  return useQuery({
    queryKey: ["tarifa", hogarId],
    queryFn: () => obtenerTarifa(hogarId!),
    enabled: !!hogarId,
    retry: false, // 404 = aún no hay tarifa cargada: no es un fallo transitorio
  });
}
