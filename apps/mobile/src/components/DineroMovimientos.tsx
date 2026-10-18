import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Icono } from "./Icono";
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
  /** Botón de ícono a la derecha (por ejemplo, borrar). */
  accion?: { etiqueta: string; alPulsar: () => void };
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
            accessible={!f.accion}
            accessibilityLabel={f.accion ? undefined : [f.valor, f.destacada ? "la última" : null, f.detalle, f.nota].filter(Boolean).join(". ")}
            style={{ flexDirection: "row", alignItems: "center", gap: espacio.m, minHeight: 64, paddingVertical: espacio.m, paddingLeft: espacio.l, paddingRight: f.accion ? espacio.xs : espacio.l }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
                <Texto style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}>{f.valor}</Texto>
                {f.destacada && (
                  <View style={{ backgroundColor: colores.tarjetaHundida, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 }}>
                    <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
                      Última
                    </Texto>
                  </View>
                )}
              </View>
              {f.detalle && (
                <Texto variante="secundario" color={colores.textoSecundario}>
                  {f.detalle}
                </Texto>
              )}
            </View>
            {f.nota && (
              <Texto variante="secundario" color={f.tonoNota === "verde" ? colores.verde : colores.textoSecundario} style={{ fontWeight: "500", textAlign: "right", maxWidth: "50%", fontVariant: ["tabular-nums"] }}>
                {f.nota}
              </Texto>
            )}
            {f.accion && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={f.accion.etiqueta}
                onPress={f.accion.alPulsar}
                hitSlop={4}
                style={({ pressed }) => ({ minWidth: AREA_TOQUE_MIN, minHeight: AREA_TOQUE_MIN, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colores.rojoFondo : "transparent" })}
              >
                <Icono nombre="borrar" tamano={20} color={colores.rojo} />
              </Pressable>
            )}
          </View>
        </Fragment>
      ))}
    </Tarjeta>
  );
}
