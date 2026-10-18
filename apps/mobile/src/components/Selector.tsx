import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { seleccionar } from "@/lib/haptica";
import { AREA_TOQUE_MIN, BORDE_FINO, colores, espacio, radios, sombras } from "@/theme";

import { Texto } from "./Texto";

type Props<T extends string | number> = {
  etiqueta: string;
  opciones: readonly { valor: T; titulo: string }[];
  valor: T | null;
  alCambiar: (valor: T) => void;
};

/** Con opciones cortas (estrato, tipo de medidor) cabe todo en una fila: control segmentado. Con nombres largos (agentes, dispositivos),
 *  una lista con un círculo por opción. */
const caben = (opciones: readonly { titulo: string }[]) =>
  opciones.length <= 6 && opciones.every((o) => o.titulo.length <= 10) && opciones.reduce((n, o) => n + o.titulo.length, 0) <= 24;

/** Elegir una opción entre pocas: todas a la vista, sin menú desplegable. Cada opción es un botón con su estado «seleccionado». */
export function Selector<T extends string | number>({ etiqueta, opciones, valor, alCambiar }: Props<T>) {
  const elegir = (v: T) => {
    if (v !== valor) seleccionar();
    alCambiar(v);
  };
  return (
    <View style={{ gap: espacio.s }} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
        {etiqueta}
      </Texto>
      {caben(opciones) ? (
        <View style={{ flexDirection: "row", backgroundColor: colores.tarjetaHundida, borderRadius: radios.m, padding: 3, gap: 3 }}>
          {opciones.map((o) => {
            const elegida = o.valor === valor;
            return (
              <Pressable
                key={String(o.valor)}
                accessibilityRole="button"
                accessibilityLabel={o.titulo}
                accessibilityState={{ selected: elegida }}
                onPress={() => elegir(o.valor)}
                style={({ pressed }) => [
                  { flex: 1, minHeight: AREA_TOQUE_MIN + 2, borderRadius: radios.m - 3, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
                  elegida ? { backgroundColor: colores.tarjeta, borderWidth: BORDE_FINO, borderColor: colores.borde, ...sombras.suave } : pressed && { backgroundColor: "rgba(20,19,17,0.05)" },
                ]}
              >
                <Texto color={elegida ? colores.texto : colores.textoSecundario} style={{ fontWeight: elegida ? "600" : "500", fontVariant: ["tabular-nums"] }} numberOfLines={1}>
                  {o.titulo}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ backgroundColor: colores.tarjetaHundida, borderRadius: radios.m, overflow: "hidden" }}>
          {opciones.map((o, i) => {
            const elegida = o.valor === valor;
            return (
              <Fragment key={String(o.valor)}>
                {i > 0 && <View style={{ height: BORDE_FINO, backgroundColor: colores.bordeFuerte, marginLeft: 52, opacity: 0.6 }} />}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={o.titulo}
                  accessibilityState={{ selected: elegida }}
                  onPress={() => elegir(o.valor)}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: AREA_TOQUE_MIN + 8, paddingHorizontal: 16, backgroundColor: pressed ? "rgba(20,19,17,0.05)" : "transparent" })}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: elegida ? 0 : 1.5,
                      borderColor: colores.bordeFuerte,
                      backgroundColor: elegida ? colores.primario : colores.tarjeta,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {elegida && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colores.sobrePrimario }} />}
                  </View>
                  <Texto style={{ flex: 1, fontWeight: elegida ? "600" : "400" }}>{o.titulo}</Texto>
                </Pressable>
              </Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
}
