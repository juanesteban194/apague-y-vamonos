import { Fragment } from "react";
import { View } from "react-native";

import type { PuntoConsumo } from "@/api/tipos";
import { nombreMes } from "@/lib/fechas";
import { formatoCOP } from "@/lib/formato";
import { BORDE_FINO, colores, espacio } from "@/theme";

import { Texto } from "./Texto";

const mayuscula = (t: string) => t[0].toUpperCase() + t.slice(1);

/** Lo que costó cada mes, del más reciente al más viejo. Empieza en el primer mes con consumo: los meses de antes de conectar
 *  el enchufe no se listan (no son «$0», es que no había medida). */
export function ConsumoMeses({ serie }: { serie: PuntoConsumo[] }) {
  const primero = serie.findIndex((p) => p.kwh > 0);
  if (primero < 0) return null;
  const actual = serie[serie.length - 1].inicio;
  const meses = serie.slice(primero).reverse();
  return (
    <View accessibilityRole="list" style={{ borderTopWidth: BORDE_FINO, borderTopColor: colores.separador }}>
      {meses.map((p, i) => {
        const esActual = i === 0;
        const nombre = mayuscula(nombreMes(p.inicio, actual));
        const valor = formatoCOP(p.costo_cop);
        return (
          <Fragment key={p.inicio}>
            {i > 0 && <View style={{ height: BORDE_FINO, backgroundColor: colores.separador }} />}
            <View
              accessible
              accessibilityLabel={`${nombre}${esActual ? ", va hasta hoy" : ""}: ${valor}`}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.m, paddingVertical: espacio.m }}
            >
              <View style={{ flexShrink: 1 }}>
                <Texto style={{ fontWeight: esActual ? "600" : "400" }}>{nombre}</Texto>
                {esActual && (
                  <Texto variante="secundario" color={colores.textoSecundario}>
                    Va hasta hoy
                  </Texto>
                )}
              </View>
              <Texto style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}>{valor}</Texto>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
