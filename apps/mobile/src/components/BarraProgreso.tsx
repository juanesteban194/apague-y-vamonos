import { View } from "react-native";

import { colores } from "@/theme";

type Props = { proporcion: number; color: string; descripcion: string; alto?: number };

/** Barra de avance fina y redondeada. `proporcion` de 0 a 1; se muestra al menos un tramito para que no parezca vacía. */
export function BarraProgreso({ proporcion, color, descripcion, alto = 8 }: Props) {
  const p = Math.max(0, Math.min(1, proporcion));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={descripcion}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
      style={{ height: alto, borderRadius: 999, backgroundColor: "rgba(20,19,17,0.07)", overflow: "hidden" }}
    >
      <View style={{ width: `${Math.max(p * 100, p > 0 ? 3 : 0)}%`, height: "100%", borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

export const colorDelNivel = (nivel: "verde" | "amarillo" | "rojo") =>
  ({ verde: colores.semaforoVerde, amarillo: colores.semaforoAmbar, rojo: colores.semaforoRojo })[nivel];
