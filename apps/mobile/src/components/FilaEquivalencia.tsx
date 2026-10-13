import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import type { Equivalencia } from "@/api/tipos";
import { colores } from "@/theme";

import { Texto } from "./Texto";

const ICONOS: Record<string, keyof typeof Ionicons.glyphMap> = { tv: "tv", plug: "battery-charging", burger: "fast-food", milk: "water" };

/** "Es como dejar el televisor de la sala prendido 21 horas." con su ícono en cajita (mockup). */
export function FilaEquivalencia({ equivalencia, primera }: { equivalencia: Equivalencia; primera: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: primera ? colores.verdeFondo : colores.fondo, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={ICONOS[equivalencia.icono] ?? "flash"} size={24} color={primera ? colores.verde : colores.textoSecundario} />
      </View>
      <Texto variante="cuerpo" style={{ flex: 1, fontWeight: primera ? "700" : "400" }}>
        {equivalencia.texto}
      </Texto>
    </View>
  );
}
