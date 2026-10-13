import { View } from "react-native";

import { DIAS_CORTOS } from "@/lib/horarios";
import { colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { Texto } from "./Texto";

type Props = { dias: number[]; alCambiar: (dias: number[]) => void };

/** Los siete días como botones de a uno (se pueden marcar varios). Lunes = 0, como en la API. */
export function SelectorDias({ dias, alCambiar }: Props) {
  const alternar = (d: number) => alCambiar(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort((a, b) => a - b));
  return (
    <View style={{ gap: espacio.s }}>
      <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "600" }}>
        Días
      </Texto>
      <View accessibilityRole="menu" style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>
        {DIAS_CORTOS.map((nombre, d) => (
          <Boton key={nombre} titulo={nombre} variante="secundario" seleccionado={dias.includes(d)} onPress={() => alternar(d)} />
        ))}
      </View>
    </View>
  );
}
