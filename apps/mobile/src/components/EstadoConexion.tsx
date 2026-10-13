import { View } from "react-native";

import type { EstadoConexion as Estado } from "@/realtime/eventos";
import { colores } from "@/theme";

import { Texto } from "./Texto";

const MENSAJES: Record<Estado, string | null> = {
  conectado: null,
  conectando: "Conectando en vivo…",
  reconectando: "Sin conexión en vivo. Reintentando…",
  sin_acceso: "No tienes acceso en vivo a este hogar.",
};

/** Aviso solo cuando NO hay datos en vivo; con conexión no ocupa espacio. */
export function EstadoConexion({ estado }: { estado: Estado }) {
  const mensaje = MENSAJES[estado];
  if (!mensaje) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: colores.ambarFondo, borderRadius: 12, padding: 12 }}>
      <Texto variante="secundario" color={colores.ambar}>
        {mensaje}
      </Texto>
    </View>
  );
}
