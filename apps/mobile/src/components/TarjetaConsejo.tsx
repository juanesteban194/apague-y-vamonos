import { Pressable, View } from "react-native";

import type { Consejo } from "@/api/tipos";
import { formatoCOP } from "@/lib/formato";
import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Icono, type NombreIcono } from "./Icono";
import { IconoEnCaja, Pastilla, Separador, type Tono } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** Ícono que manda el backend (`icono`) → ícono de la app, por significado. */
export const ICONO_DEL_CONSEJO: Record<string, NombreIcono> = {
  receipt: "facturaLinea",
  gauge: "medidorLinea",
  plug: "enchufeLinea",
  alert: "alertaLinea",
  chart: "grafica",
  moon: "luna",
  swap: "simulador",
};

export const TEXTO_DEL_BOTON: Record<NonNullable<Consejo["accion"]>, string> = {
  historial: "Anotar mis facturas",
  medidor: "Anotar lectura del medidor",
  enchufe: "Conectar un enchufe",
  rutina: "Programar el apagado",
  simulador: "Comparar con uno nuevo",
};

/** Verde si ahorra, ámbar si avisa que vas por encima del promedio y neutro si solo pide un dato. */
function tonoDe(c: Consejo): Tono {
  if (c.tipo === "sobre_promedio") return "ambar";
  if (c.tipo === "completar") return "neutro";
  return c.ahorro_cop_mes != null || c.tipo === "rutina" ? "verde" : "neutro";
}

type Props = { consejo: Consejo; alActuar: (c: Consejo) => void };

/** Un consejo: ícono en caja suave junto al título, la explicación, «Ahorra unos $X al mes» si el backend midió el ahorro
 *  y, abajo, la acción como fila con flecha (como las tarjetas de Apple Salud). */
export function TarjetaConsejo({ consejo: c, alActuar }: Props) {
  const accion = c.accion ? TEXTO_DEL_BOTON[c.accion] : null;
  return (
    <Tarjeta style={{ padding: 0, gap: 0, overflow: "hidden" }}>
      <View style={{ padding: 18, gap: espacio.m }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <IconoEnCaja nombre={ICONO_DEL_CONSEJO[c.icono] ?? "consejoLinea"} tono={tonoDe(c)} tamano={40} />
          <Texto variante="subtitulo" style={{ flex: 1 }}>
            {c.titulo}
          </Texto>
        </View>
        <Texto color={colores.textoSecundario}>{c.mensaje}</Texto>
        {c.ahorro_cop_mes != null && <Pastilla tono="verde" icono="hoja" texto={`Ahorra unos ${formatoCOP(c.ahorro_cop_mes)} al mes`} />}
      </View>
      {accion && (
        <>
          <Separador sangria={18} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accion}
            onPress={() => alActuar(c)}
            style={({ pressed }) => ({
              minHeight: AREA_TOQUE_MIN + 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: espacio.m,
              paddingHorizontal: 18,
              backgroundColor: pressed ? "rgba(20,19,17,0.04)" : "transparent",
            })}
          >
            <Texto style={{ fontWeight: "600", flex: 1 }}>{accion}</Texto>
            <Icono nombre="adelante" tamano={18} color="rgba(20,19,17,0.35)" />
          </Pressable>
        </>
      )}
    </Tarjeta>
  );
}
