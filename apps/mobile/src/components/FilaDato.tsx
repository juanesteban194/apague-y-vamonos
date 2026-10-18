import { View } from "react-native";

import { BORDE_FINO, colores } from "@/theme";

import { Texto } from "./Texto";

/** Una fila de la tarjeta de datos del hogar (mockup): etiqueta y explicación a la izquierda, valor a la derecha. */
export function FilaDato({ etiqueta, detalle, valor, ultima }: { etiqueta: string; detalle: string; valor: string; ultima?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${etiqueta}: ${valor}. ${detalle}`}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 14, borderBottomWidth: ultima ? 0 : BORDE_FINO, borderBottomColor: colores.separador }}
    >
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpo" style={{ fontWeight: "500" }}>
          {etiqueta}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {detalle}
        </Texto>
      </View>
      <Texto variante="cuerpo" style={{ fontWeight: "600", textAlign: "right", maxWidth: "45%" }}>
        {valor}
      </Texto>
    </View>
  );
}
