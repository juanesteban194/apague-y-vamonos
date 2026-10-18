import { Pressable, View } from "react-native";

import { AREA_TOQUE_MIN, BORDE_FINO, colores, radios } from "@/theme";

import { Texto } from "./Texto";

type Props = { titulo: string; detalle: string; seleccionada: boolean; alElegir: () => void };

/** Opción de una lista de a una (mockup de «¿Cada cuánto te avisamos?»). Elegida: borde de tinta fino y punto lleno. */
export function OpcionRadio({ titulo, detalle, seleccionada, alElegir }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={`${titulo}. ${detalle}`}
      onPress={alElegir}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        minHeight: AREA_TOQUE_MIN + 14,
        borderRadius: radios.m,
        borderWidth: seleccionada ? 1.5 : BORDE_FINO * 2,
        borderColor: seleccionada ? colores.primario : colores.borde,
        backgroundColor: pressed ? colores.tarjetaHundida : colores.tarjeta,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: seleccionada ? 6.5 : 1.5,
          borderColor: seleccionada ? colores.primario : colores.bordeFuerte,
          backgroundColor: colores.tarjeta,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Texto style={{ fontWeight: "600" }}>{titulo}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {detalle}
        </Texto>
      </View>
    </Pressable>
  );
}
