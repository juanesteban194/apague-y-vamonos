import { useState } from "react";
import { Platform, TextInput, View, type TextInputProps } from "react-native";

import { AREA_TOQUE_MIN, colores, espacio, fuentes, radios } from "@/theme";

import { Texto } from "./Texto";

type Props = TextInputProps & { etiqueta: string; ayuda?: string; error?: boolean };

/** Campo de texto con etiqueta visible (no solo marcador): fondo hundido suave, sin borde hasta que se enfoca. Alto ≥ 44 px, texto de 17 px. */
export function Campo({ etiqueta, ayuda, error, style, onFocus, onBlur, ...resto }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
        {etiqueta}
      </Texto>
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor="rgba(20,19,17,0.36)"
        selectionColor={colores.texto}
        maxFontSizeMultiplier={1.6}
        {...resto}
        onFocus={(e) => {
          setEnfocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          onBlur?.(e);
        }}
        style={[
          {
            minHeight: AREA_TOQUE_MIN + 8,
            borderWidth: 1.5,
            borderColor: error ? colores.rojo : enfocado ? colores.texto : "transparent",
            borderRadius: radios.m,
            paddingHorizontal: 16,
            fontSize: 17,
            fontFamily: fuentes.regular,
            color: colores.texto,
            backgroundColor: enfocado ? colores.tarjeta : colores.tarjetaHundida,
          },
          // En la web, el navegador agrega su contorno azul de enfoque; aquí el enfoque ya lo marca el borde.
          Platform.OS === "web" && ({ outlineStyle: "none" } as object),
          style,
        ]}
      />
      {ayuda && (
        <Texto variante="secundario" color={error ? colores.rojo : colores.textoSecundario} style={{ marginTop: espacio.xs / 2 }}>
          {ayuda}
        </Texto>
      )}
    </View>
  );
}
