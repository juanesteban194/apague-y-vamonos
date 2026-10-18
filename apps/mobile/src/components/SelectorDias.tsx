import { Pressable, View } from "react-native";

import { seleccionar } from "@/lib/haptica";
import { DIAS_CORTOS, textoDias } from "@/lib/horarios";
import { AREA_TOQUE_MIN, BORDE_FINO, colores, espacio } from "@/theme";

import { Texto } from "./Texto";

type Props = { dias: number[]; alCambiar: (dias: number[]) => void };

/** Los siete días como píldoras finas de esquinas suaves, en una fila (se pueden marcar varios). Lunes = 0, como en la API. */
export function SelectorDias({ dias, alCambiar }: Props) {
  const alternar = (d: number) => {
    seleccionar();
    alCambiar(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort((a, b) => a - b));
  };
  return (
    <View style={{ gap: espacio.s }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: espacio.s }}>
        <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
          Días
        </Texto>
        <Texto variante="secundario" color={dias.length ? colores.texto : colores.textoSecundario} style={{ fontWeight: "500" }}>
          {dias.length ? textoDias(dias) : "Ningún día"}
        </Texto>
      </View>
      <View accessibilityRole="menu" style={{ flexDirection: "row", gap: 4 }}>
        {DIAS_CORTOS.map((nombre, d) => {
          const elegido = dias.includes(d);
          return (
            <Pressable
              key={nombre}
              accessibilityRole="button"
              accessibilityLabel={nombre}
              accessibilityState={{ selected: elegido }}
              onPress={() => alternar(d)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: AREA_TOQUE_MIN,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: elegido ? colores.primario : colores.tarjeta,
                borderWidth: elegido ? 0 : BORDE_FINO * 2,
                borderColor: colores.bordeFuerte,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Texto variante="secundario" color={elegido ? colores.sobrePrimario : colores.texto} style={{ fontWeight: "500", letterSpacing: -0.2 }} numberOfLines={1}>
                {nombre}
              </Texto>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
