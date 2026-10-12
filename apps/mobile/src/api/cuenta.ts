import { useQuery } from "@tanstack/react-query";

import { listarAgentes, listarDispositivos, obtenerHogares, obtenerPerfil } from "./cliente";
import type { Hogar, Perfil } from "./tipos";

export type PasoDeNavegacion = "sesion" | "cargando" | "consentimiento" | "hogar" | "lista";

/** Qué pantalla toca según en qué punto de la cuenta está la persona. Pura, para poder probarla. */
export function pasoDeNavegacion(args: {
  autenticado: boolean;
  perfil: Perfil | undefined;
  hogares: Hogar[] | undefined;
}): PasoDeNavegacion {
  if (!args.autenticado) return "sesion";
  if (!args.perfil) return "cargando";
  if (!args.perfil.tiene_consentimiento) return "consentimiento"; // Ley 1581: antes de usar cualquier dato
  if (!args.hogares) return "cargando";
  return args.hogares.length === 0 ? "hogar" : "lista";
}

export function usePerfil(habilitado: boolean) {
  return useQuery({ queryKey: ["perfil"], queryFn: obtenerPerfil, enabled: habilitado, retry: 1 });
}

export function useHogares(habilitado: boolean) {
  return useQuery({ queryKey: ["hogares"], queryFn: obtenerHogares, enabled: habilitado, retry: 1 });
}

export function useDispositivos(hogarId: string | undefined) {
  return useQuery({ queryKey: ["dispositivos", hogarId], queryFn: () => listarDispositivos(hogarId!), enabled: !!hogarId });
}

export function useAgentes(hogarId: string | undefined) {
  return useQuery({ queryKey: ["agentes", hogarId], queryFn: () => listarAgentes(hogarId!), enabled: !!hogarId, refetchInterval: 15_000 });
}
