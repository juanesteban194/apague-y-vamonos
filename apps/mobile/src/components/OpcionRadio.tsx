import { Pressable, View } from "react-native";

import { AREA_TOQUE_MIN, colores } from "@/theme";

import { Texto } from "./Texto";

type Props = { titulo: string; detalle: string; seleccionada: boolean; alElegir: () => void };

/** Opción de una lista de a una (mockup de "¿Cada cuánto le avisamos?"): punto a la izquierda, borde de tinta cuando está elegida. */
export function OpcionRadio({ titulo, detalle, seleccionada, alElegir }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={`${titulo}. ${detalle}`}
      onPress={alElegir}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        padding: 14,
        minHeight: AREA_TOQUE_MIN + 14,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: seleccionada ? colores.primario : colores.borde,
        backgroundColor: seleccionada ? colores.fondo : colores.tarjeta,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: seleccionada ? colores.primario : colores.textoSecundario,
          backgroundColor: seleccionada ? colores.primario : "transparent",
        }}
      />
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpo" style={{ fontWeight: "700" }}>
          {titulo}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {detalle}
        </Texto>
      </View>
    </Pressable>
  );
}
