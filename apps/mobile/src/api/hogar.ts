import { useQuery } from "@tanstack/react-query";

import { casaVigente, useCasaSeleccionada } from "@/features/casas/seleccion";

import { obtenerHogares, obtenerTarifa } from "./cliente";

/** La casa que la persona eligió (o la primera si aún no eligió). Todas las pantallas leen de aquí. */
export function useHogarActual() {
  const consulta = useQuery({ queryKey: ["hogares"], queryFn: obtenerHogares });
  const elegida = useCasaSeleccionada((s) => s.id);
  return { ...consulta, hogar: casaVigente(consulta.data, elegida), hogares: consulta.data };
}

export function useTarifa(hogarId: string | undefined) {
  return useQuery({
    queryKey: ["tarifa", hogarId],
    queryFn: () => obtenerTarifa(hogarId!),
    enabled: !!hogarId,
    retry: false, // 404 = aún no hay tarifa cargada: no es un fallo transitorio
  });
}
