import { useQuery } from "@tanstack/react-query";

import { listarRutinas } from "@/api/cliente";

export function useRutinas(hogarId: string | undefined) {
  return useQuery({ queryKey: ["rutinas", hogarId], queryFn: () => listarRutinas(hogarId!), enabled: !!hogarId });
}
