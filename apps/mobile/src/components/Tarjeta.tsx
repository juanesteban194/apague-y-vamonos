import { View, type ViewProps } from "react-native";

import { BORDE_FINO, colores, espacio, radios, sombras } from "@/theme";

export type VarianteTarjeta = "normal" | "plana" | "oscura" | "verde" | "ambar" | "rojo";

const ESTILOS: Record<VarianteTarjeta, object> = {
  normal: { backgroundColor: colores.tarjeta, borderWidth: BORDE_FINO, borderColor: colores.borde, ...sombras.suave },
  plana: { backgroundColor: colores.tarjetaHundida },
  oscura: { backgroundColor: colores.oscuro, ...sombras.media },
  verde: { backgroundColor: colores.verdeFondo, borderWidth: BORDE_FINO, borderColor: "rgba(14,107,58,0.16)" },
  ambar: { backgroundColor: colores.ambarFondo, borderWidth: BORDE_FINO, borderColor: "rgba(138,101,20,0.18)" },
  rojo: { backgroundColor: colores.rojoFondo, borderWidth: BORDE_FINO, borderColor: "rgba(185,58,40,0.18)" },
};

type Props = ViewProps & { variante?: VarianteTarjeta };

/** Superficie de contenido: blanca con borde de un pelo y sombra apenas perceptible. `oscura` para la protagonista de una pantalla;
 *  `verde`/`ambar`/`rojo` para estados del semáforo; `plana` para agrupar sin elevar. */
export function Tarjeta({ style, variante = "normal", ...resto }: Props) {
  return <View {...resto} style={[{ borderRadius: radios.l, padding: 18, gap: espacio.xs }, ESTILOS[variante], style]} />;
}
