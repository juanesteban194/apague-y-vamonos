import { Text, type TextProps } from "react-native";

import { colores, tipografia } from "@/theme";

type Variante = keyof typeof tipografia;

type Props = TextProps & { variante?: Variante; color?: string };

export function Texto({ variante = "cuerpo", color = colores.texto, style, ...resto }: Props) {
  return <Text {...resto} style={[tipografia[variante], { color }, style]} />;
}
