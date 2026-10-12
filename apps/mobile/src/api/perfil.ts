import { useQuery } from "@tanstack/react-query";

import { obtenerPerfil } from "./cliente";

/** El perfil que ya cargó la navegación (misma clave de caché). */
export function usePerfilActual() {
  return useQuery({ queryKey: ["perfil"], queryFn: obtenerPerfil });
}
