import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { colores, familiaDelPeso, tipografia, type VarianteTexto } from "@/theme";

type Props = TextProps & { variante?: VarianteTexto; color?: string };

/** Todo texto de la app pasa por aquí: aplica la escala tipográfica y elige la familia de Inter que corresponde al peso (en Android una fuente
 *  propia ignora `fontWeight`). Con letra grande del sistema crece, pero con tope para que nada se desarme. */
export function Texto({ variante = "cuerpo", color = colores.texto, style, maxFontSizeMultiplier = 1.6, ...resto }: Props) {
  const plano = StyleSheet.flatten<TextStyle>([tipografia[variante], { color }, style]);
  const { fontWeight, ...sinPeso } = plano;
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...resto} style={[sinPeso, { fontFamily: plano.fontFamily ?? familiaDelPeso(fontWeight) }]} />;
}
