import { View, type ViewProps } from "react-native";

import { colores, espacio } from "@/theme";

export function Tarjeta({ style, ...resto }: ViewProps) {
  return (
    <View
      {...resto}
      style={[
        { backgroundColor: colores.tarjeta, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colores.borde, gap: espacio.xs },
        style,
      ]}
    />
  );
}
