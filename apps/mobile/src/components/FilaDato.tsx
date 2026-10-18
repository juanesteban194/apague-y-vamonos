import { View } from "react-native";

import { BORDE_FINO, colores } from "@/theme";

import { Texto } from "./Texto";

/** Una fila de datos de la casa (mockup) dentro de una lista agrupada (`Tarjeta` con padding 0): etiqueta y explicación a la izquierda,
 *  valor a la derecha. La línea de abajo va con sangría, como en los Ajustes de iOS; la última fila no la lleva. */
export function FilaDato({ etiqueta, detalle, valor, ultima }: { etiqueta: string; detalle: string; valor: string; ultima?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${valor}. ${detalle}`} style={{ paddingLeft: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          minHeight: 64,
          paddingVertical: 12,
          paddingRight: 16,
          borderBottomWidth: ultima ? 0 : BORDE_FINO,
          borderBottomColor: colores.separador,
        }}
      >
        <View style={{ flex: 1, gap: 1 }}>
          <Texto style={{ fontWeight: "500" }}>{etiqueta}</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {detalle}
          </Texto>
        </View>
        <Texto style={{ fontWeight: "600", textAlign: "right", maxWidth: "48%", fontVariant: ["tabular-nums"] }}>{valor}</Texto>
      </View>
    </View>
  );
}
