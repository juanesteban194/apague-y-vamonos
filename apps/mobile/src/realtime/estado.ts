import { create } from "zustand";

import type { EstadoConexion } from "./eventos";

/** Estado del tiempo real compartido por todas las pantallas (una sola conexión para toda la app). */
export const useTiempoReal = create<{ conexion: EstadoConexion; pushActivo: boolean }>(() => ({ conexion: "conectando", pushActivo: false }));
