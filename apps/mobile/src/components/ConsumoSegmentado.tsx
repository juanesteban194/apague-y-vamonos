import { Pressable, View } from "react-native";

import { seleccionar } from "@/lib/haptica";
import { AREA_TOQUE_MIN, colores, radios, sombras } from "@/theme";

import { Texto } from "./Texto";

type Props<T extends string> = {
  opciones: readonly { valor: T; titulo: string }[];
  valor: T;
  alCambiar: (valor: T) => void;
  etiqueta: string;
};

/** Control segmentado como el de iOS: fondo hundido y la opción elegida como una píldora blanca con sombra suave. */
export function ConsumoSegmentado<T extends string>({ opciones, valor, alCambiar, etiqueta }: Props<T>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={etiqueta} style={{ flexDirection: "row", backgroundColor: colores.tarjetaHundida, borderRadius: radios.m, padding: 3 }}>
      {opciones.map((o) => {
        const elegida = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="tab"
            accessibilityLabel={o.titulo}
            accessibilityState={{ selected: elegida }}
            onPress={() => {
              if (elegida) return;
              seleccionar();
              alCambiar(o.valor);
            }}
            style={({ pressed }) => [
              { flex: 1, minHeight: AREA_TOQUE_MIN, borderRadius: radios.m - 3, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
              elegida ? { backgroundColor: colores.tarjeta, ...sombras.suave } : null,
              pressed && !elegida ? { opacity: 0.6 } : null,
            ]}
          >
            <Texto variante="secundario" color={elegida ? colores.texto : colores.textoSecundario} style={{ fontWeight: elegida ? "600" : "500" }}>
              {o.titulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
