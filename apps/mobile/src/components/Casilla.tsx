import { Pressable, View } from "react-native";

import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Texto } from "./Texto";

type Props = { marcada: boolean; alCambiar: (marcada: boolean) => void; texto: string };

/** Casilla con texto: toda la fila es tocable (≥ 44 px). Cuadro redondeado de borde fino; marcada, se llena de tinta. */
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
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: marcada ? 0 : 1.5,
          borderColor: colores.bordeFuerte,
          backgroundColor: marcada ? colores.primario : colores.tarjeta,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {marcada && <Texto variante="secundario" color={colores.sobrePrimario} style={{ fontWeight: "700", lineHeight: 18 }}>✓</Texto>}
      </View>
      <Texto variante="secundario" style={{ flex: 1 }}>
        {texto}
      </Texto>
    </Pressable>
  );
}
