import { View } from "react-native";

import type { EstadoConexion as Estado } from "@/realtime/eventos";
import { colores, radios } from "@/theme";

import { Texto } from "./Texto";

const MENSAJES: Record<Estado, string | null> = {
  conectado: null,
  conectando: "Conectando en vivo…",
  reconectando: "Sin conexión en vivo. Reintentando…",
  sin_acceso: "No tienes acceso en vivo a esta casa.",
};

/** Aviso discreto solo cuando NO hay datos en vivo; con conexión no ocupa espacio. */
export function EstadoConexion({ estado }: { estado: Estado }) {
  const mensaje = MENSAJES[estado];
  if (!mensaje) return null;
  return (
    <View accessibilityRole="alert" style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colores.ambarFondo, borderRadius: radios.total, paddingHorizontal: 12, paddingVertical: 7 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colores.semaforoAmbar }} />
      <Texto variante="secundario" color={colores.ambar} style={{ fontWeight: "500" }}>
        {mensaje}
      </Texto>
    </View>
  );
}
