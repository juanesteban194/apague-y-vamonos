import { Pressable, View } from "react-native";

import { seleccionar } from "@/lib/haptica";
import { AREA_TOQUE_MIN, colores } from "@/theme";

import { Icono } from "./Icono";
import { Texto } from "./Texto";

type Props = { titulo: string; detalle: string; seleccionada: boolean; alElegir: () => void };

/** Una opción de una lista de a una, como en los Ajustes de iOS: va dentro de una `Tarjeta` sin relleno y separada con `Separador`.
 *  Sin bordes propios: la elegida se nota por el círculo lleno con la marca y por el título un poco más firme. */
export function OpcionRadio({ titulo, detalle, seleccionada, alElegir }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={`${titulo}. ${detalle}`}
      onPress={() => {
        if (!seleccionada) seleccionar();
        alElegir();
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: AREA_TOQUE_MIN + 16,
        paddingVertical: 13,
        paddingHorizontal: 16,
        backgroundColor: pressed ? "rgba(20,19,17,0.04)" : "transparent",
      })}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: seleccionada ? 0 : 1.5,
          borderColor: colores.bordeFuerte,
          backgroundColor: seleccionada ? colores.primario : "transparent",
        }}
      >
        {seleccionada && <Icono nombre="marca" tamano={15} color={colores.sobrePrimario} />}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Texto style={{ fontWeight: seleccionada ? "600" : "500" }}>{titulo}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {detalle}
        </Texto>
      </View>
    </Pressable>
  );
}
