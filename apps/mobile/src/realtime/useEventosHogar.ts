import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { ConexionHogar } from "./conexion";
import type { EstadoConexion, EventoEnVivo } from "./eventos";

/** Mantiene el WebSocket del hogar mientras la app está activa; en segundo plano lo cierra. */
export function useEventosHogar(hogarId: string | undefined, alEvento: (evento: EventoEnVivo) => void): EstadoConexion {
  const [estado, setEstado] = useState<EstadoConexion>("conectando");
  const manejador = useRef(alEvento);
  manejador.current = alEvento;

  useEffect(() => {
    if (!hogarId) return;
    const conexion = new ConexionHogar(hogarId, (e) => manejador.current(e), setEstado);
    // Al arrancar, currentState puede venir como "unknown": solo se espera si la app está de verdad en segundo plano.
    if (AppState.currentState !== "background") conexion.iniciar();
    const suscripcion = AppState.addEventListener("change", (s) => {
      if (s === "active") conexion.iniciar();
      else conexion.detener();
    });
    return () => {
      suscripcion.remove();
      conexion.detener();
    };
  }, [hogarId]);

  return estado;
}
