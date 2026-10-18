import * as almacen from "@/lib/almacen";
import { create } from "zustand";

import type { Hogar } from "@/api/tipos";

const CLAVE = "casa_seleccionada";

/** La casa que la persona está viendo. Se recuerda entre aperturas de la app. */
export const useCasaSeleccionada = create<{ id: string | null }>(() => ({ id: null }));

export async function cargarCasaSeleccionada(): Promise<void> {
  try {
    useCasaSeleccionada.setState({ id: await almacen.leer(CLAVE) });
  } catch {
    useCasaSeleccionada.setState({ id: null });
  }
}

export async function elegirCasa(id: string | null): Promise<void> {
  useCasaSeleccionada.setState({ id });
  try {
    if (id) await almacen.guardar(CLAVE, id);
    else await almacen.borrar(CLAVE);
  } catch {
    // sin almacenamiento solo se pierde el recuerdo: la casa elegida sigue valiendo en esta sesión
  }
}

/** La casa elegida si todavía existe; si no (se borró o es otra cuenta), la primera. */
export function casaVigente(hogares: Hogar[] | undefined, id: string | null): Hogar | undefined {
  return hogares?.find((h) => h.id === id) ?? hogares?.[0];
}
