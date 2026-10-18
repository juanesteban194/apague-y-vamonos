import { View } from "react-native";

import type { DispositivoResumen } from "@/api/tipos";
import { colores, espacio } from "@/theme";

import { vatios } from "./InicioFormato";
import { IconoEnCaja } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** «Ahora mismo»: la potencia que suman los dispositivos prendidos (ya viene en el resumen; aquí solo se suma) y cuántos hay prendidos.
 *  No muestra costos: esos los calcula el backend. */
export function InicioAhora({ dispositivos, enVivo }: { dispositivos: DispositivoResumen[]; enVivo: boolean }) {
  const prendidos = dispositivos.filter((d) => d.encendido === true);
  const total = prendidos.reduce((suma, d) => suma + (d.potencia_w ?? 0), 0);
  const cuantos =
    prendidos.length > 0 ? `Prendidos: ${prendidos.length} de ${dispositivos.length}` : dispositivos.length === 1 ? "Está apagado" : "Ninguno está prendido";
  return (
    <Tarjeta accessible accessibilityLabel={`Ahora mismo: ${vatios(total)} en uso. ${cuantos}.`} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 }}>
      <IconoEnCaja nombre="rayo" tono="neutro" tamano={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.s }}>
          <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
            Ahora mismo
          </Texto>
          {enVivo && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colores.semaforoVerde, boxShadow: "0px 0px 0px 3px rgba(30,158,90,0.16)" }} />
              <Texto variante="secundario" color={colores.verde} style={{ fontWeight: "500" }}>
                En vivo
              </Texto>
            </View>
          )}
        </View>
        <Texto variante="subtitulo" style={{ fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontVariant: ["tabular-nums"] }}>
          {`${vatios(total)} en uso`}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {cuantos}
        </Texto>
      </View>
    </Tarjeta>
  );
}
