import * as almacen from "@/lib/almacen";
import { create } from "zustand";

import type { NombreTema } from "./temas";

const CLAVE = "ayuda_vista";

/** Secciones cuya sugerencia de ayuda ya se mostró (o la persona descartó). Cada sugerencia sale una sola vez. */
export const useAyudaVista = create<{ cargada: boolean; vistas: string[] }>(() => ({ cargada: false, vistas: [] }));

export async function cargarAyudaVista(): Promise<void> {
  try {
    const crudo = await almacen.leer(CLAVE);
    useAyudaVista.setState({ cargada: true, vistas: crudo ? (JSON.parse(crudo) as string[]) : [] });
  } catch {
    useAyudaVista.setState({ cargada: true, vistas: [] });
  }
}

async function guardar(vistas: string[]) {
  useAyudaVista.setState({ vistas });
  try {
    await almacen.guardar(CLAVE, JSON.stringify(vistas));
  } catch {
    // sin almacenamiento la sugerencia vuelve a salir la próxima vez: molesta poco, no rompe nada
  }
}

export async function marcarAyudaVista(tema: NombreTema): Promise<void> {
  const { vistas } = useAyudaVista.getState();
  if (!vistas.includes(tema)) await guardar([...vistas, tema]);
}

/** Desde Ajustes: vuelve a mostrar las sugerencias de primera vez. */
export async function reiniciarAyuda(): Promise<void> {
  await guardar([]);
}
