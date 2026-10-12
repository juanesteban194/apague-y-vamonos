import { View } from "react-native";

import { espacio, colores } from "@/theme";

import { Boton } from "./Boton";
import { Texto } from "./Texto";

type Props<T extends string | number> = {
  etiqueta: string;
  opciones: readonly { valor: T; titulo: string }[];
  valor: T | null;
  alCambiar: (valor: T) => void;
};

/** Elegir una opción entre pocas (estrato, tipo de medidor): botones grandes en vez de un menú desplegable. */
export function Selector<T extends string | number>({ etiqueta, opciones, valor, alCambiar }: Props<T>) {
  return (
    <View style={{ gap: espacio.s }} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "600" }}>
        {etiqueta}
      </Texto>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>
        {opciones.map((o) => (
          <Boton key={String(o.valor)} titulo={o.titulo} variante="secundario" seleccionado={o.valor === valor} onPress={() => alCambiar(o.valor)} />
        ))}
      </View>
    </View>
  );
}
