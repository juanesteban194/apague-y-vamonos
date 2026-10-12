import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Texto } from "./Texto";

type Props = { marcada: boolean; alCambiar: (marcada: boolean) => void; texto: string };

/** Casilla con texto: toda la fila es tocable (≥ 44 px). */
export function Casilla({ marcada, alCambiar, texto }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={texto}
      onPress={() => alCambiar(!marcada)}
      style={{ flexDirection: "row", gap: espacio.m, alignItems: "flex-start", minHeight: AREA_TOQUE_MIN, paddingVertical: espacio.xs }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: marcada ? colores.primario : colores.textoSecundario,
          backgroundColor: marcada ? colores.primario : colores.tarjeta,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {marcada && <Ionicons name="checkmark" size={20} color={colores.sobrePrimario} />}
      </View>
      <Texto variante="secundario" style={{ flex: 1 }}>
        {texto}
      </Texto>
    </Pressable>
  );
}
