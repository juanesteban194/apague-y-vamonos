import { ActivityIndicator, Pressable, View } from "react-native";

import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Texto } from "./Texto";

type Props = {
  encendido: boolean | null; // null = aún no hay datos del enchufe
  cargando?: boolean;
  alCambiar: (encender: boolean) => void;
  etiquetaEncendido?: string;
  etiquetaApagado?: string;
  ayudaEncendido?: string;
  ayudaApagado?: string;
};

/** Interruptor grande (mockup: "Está prendido · Toque para apagarlo desde aquí"). Toda la fila es el área de toque. */
export function Interruptor({
  encendido,
  cargando,
  alCambiar,
  etiquetaEncendido = "Está prendido",
  etiquetaApagado = "Está apagado",
  ayudaEncendido = "Toque para apagarlo desde aquí",
  ayudaApagado = "Toque para prenderlo desde aquí",
}: Props) {
  const sinDatos = encendido == null;
  const prendido = encendido === true;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: prendido, disabled: sinDatos || !!cargando, busy: !!cargando }}
      accessibilityLabel={sinDatos ? "Sin datos del enchufe" : prendido ? etiquetaEncendido : etiquetaApagado}
      disabled={sinDatos || cargando}
      onPress={() => alCambiar(!prendido)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: espacio.l,
        minHeight: AREA_TOQUE_MIN + 20,
        opacity: pressed || sinDatos ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Texto variante="subtitulo">{sinDatos ? "Sin datos del enchufe" : prendido ? etiquetaEncendido : etiquetaApagado}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {sinDatos ? "Cuando el agente envíe lecturas podrás controlarlo." : prendido ? ayudaEncendido : ayudaApagado}
        </Texto>
      </View>
      <View
        style={{
          width: 64,
          height: 38,
          borderRadius: 19,
          padding: 4,
          justifyContent: "center",
          alignItems: prendido ? "flex-end" : "flex-start",
          backgroundColor: prendido ? colores.semaforoVerde : colores.interruptorApagado,
        }}
      >
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          {cargando && <ActivityIndicator size="small" color={colores.textoSecundario} />}
        </View>
      </View>
    </Pressable>
  );
}
