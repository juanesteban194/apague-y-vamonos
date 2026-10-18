import { View } from "react-native";

import type { Subsistencia } from "@/api/tipos";
import { colores, espacio } from "@/theme";

import { BarraProgreso, colorDelNivel } from "./BarraProgreso";
import { Boton } from "./Boton";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** Línea de subsistencia (HU-07): cuánto va del consumo que EPM subsidia este mes. Sin lectura del medidor solo cuenta los enchufes y lo dice. */
export function InicioSubsistencia({ subsistencia: s, alAnotarMedidor }: { subsistencia: Subsistencia; alAnotarMedidor: () => void }) {
  const porcentaje = Math.round(s.porcentaje * 100);
  const mensaje =
    s.nivel === "rojo"
      ? "Ya pasaste la línea: desde aquí la energía te sale más cara."
      : s.nivel === "amarillo"
        ? `Ya llevas el ${porcentaje} %: te acercas a la línea de subsistencia.`
        : `Llevas el ${porcentaje} % de la energía que EPM te subsidia este mes.`;
  return (
    <Tarjeta style={{ padding: 20, gap: espacio.m }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: espacio.m }}>
        <Texto style={{ fontWeight: "600" }}>Línea de subsistencia</Texto>
        <Texto variante="secundario" color={colores.textoSecundario} style={{ fontVariant: ["tabular-nums"] }}>
          {`${porcentaje} %`}
        </Texto>
      </View>
      <BarraProgreso proporcion={s.porcentaje} color={colorDelNivel(s.nivel)} alto={6} descripcion={`Llevas el ${porcentaje} % de la línea de subsistencia`} />
      <Texto color={colores.textoSecundario}>{mensaje}</Texto>
      {s.fuente === "enchufes" && (
        <>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Solo cuenta lo que miden tus enchufes, no toda la casa.
          </Texto>
          <Boton titulo="Anotar lectura del medidor" variante="secundario" compacto onPress={alAnotarMedidor} />
        </>
      )}
    </Tarjeta>
  );
}
