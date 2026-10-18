import { Fragment, type ReactNode } from "react";
import { View } from "react-native";

import { colores, espacio } from "@/theme";

import { Separador } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

export type FilaMovimiento = {
  clave: string;
  /** La cifra de la fila: «$28.500», «45.334,2 kWh». */
  valor: string;
  /** Cuándo: «hace 5 h», «18 de octubre». */
  detalle?: string;
  /** Dato corto a la derecha: «Gastaste $3.600». */
  nota?: string;
  tonoNota?: "verde" | "neutro";
  /** La anotación más reciente: lleva la marca «Última». */
  destacada?: boolean;
  /** Contenido a la derecha, por ejemplo un botón de borrar. Con él la fila no se agrupa para el lector de pantalla (así el botón se alcanza). */
  derecha?: ReactNode;
};

/** Historial de anotaciones (saldos, lecturas del medidor) como una lista agrupada de iOS: cifra con números tabulares, cuándo se anotó
 *  y, a la derecha, lo que cambió o una acción. */
export function DineroMovimientos({ filas }: { filas: FilaMovimiento[] }) {
  return (
    <Tarjeta style={{ padding: 0, gap: 0 }}>
      {filas.map((f, i) => (
        <Fragment key={f.clave}>
          {i > 0 && <Separador sangria={espacio.l} />}
          <View
            accessible={!f.derecha}
            accessibilityLabel={f.derecha ? undefined : [f.valor, f.destacada ? "la última" : null, f.detalle, f.nota].filter(Boolean).join(". ")}
            style={{ flexDirection: "row", alignItems: "center", gap: espacio.m, minHeight: 64, paddingVertical: espacio.m, paddingLeft: espacio.l, paddingRight: f.derecha ? espacio.xs : espacio.l }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Texto numberOfLines={1} style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}>
                {f.valor}
              </Texto>
              {(f.detalle || f.destacada) && (
                <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
                  {f.detalle}
                  {f.destacada && (
                    <Texto variante="secundario" color={colores.texto} style={{ fontWeight: "500" }}>
                      {f.detalle ? "  ·  " : ""}Última
                    </Texto>
                  )}
                </Texto>
              )}
            </View>
            {f.nota && (
              <Texto variante="secundario" color={f.tonoNota === "verde" ? colores.verde : colores.textoSecundario} style={{ fontWeight: "500", textAlign: "right", maxWidth: "50%", fontVariant: ["tabular-nums"] }}>
                {f.nota}
              </Texto>
            )}
            {f.derecha}
          </View>
        </Fragment>
      ))}
    </Tarjeta>
  );
}
