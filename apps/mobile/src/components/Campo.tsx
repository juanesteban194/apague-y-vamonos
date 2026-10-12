import { TextInput, View, type TextInputProps } from "react-native";

import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Texto } from "./Texto";

type Props = TextInputProps & { etiqueta: string; ayuda?: string };

/** Campo de texto con etiqueta visible (no solo placeholder): altura ≥ 44 px y texto de 17 px. */
export function Campo({ etiqueta, ayuda, style, ...resto }: Props) {
  return (
    <View style={{ gap: espacio.xs }}>
      <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "600" }}>
        {etiqueta}
      </Texto>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.textoSecundario}
        {...resto}
        style={[
          {
            minHeight: AREA_TOQUE_MIN + 8,
            borderWidth: 2,
            borderColor: colores.borde,
            borderRadius: 12,
            paddingHorizontal: 14,
            fontSize: 17,
            color: colores.texto,
            backgroundColor: colores.tarjeta,
          },
          style,
        ]}
      />
      {ayuda && (
        <Texto variante="secundario" color={colores.textoSecundario}>
          {ayuda}
        </Texto>
      )}
    </View>
  );
}
