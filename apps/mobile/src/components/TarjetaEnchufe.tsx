import { Pressable, View } from "react-native";

import { colores } from "@/theme";

import { Icono } from "./Icono";
import { Texto } from "./Texto";

type Props = {
  nombre: string;
  estado: string; // «Conectado», «Sin señal desde hace 2 h»…
  punto: string; // color del semáforo
  agente: string | null; // nombre del agente que lo lee; null si no tiene
  alPulsar: () => void;
};

/** Un enchufe en la lista: cómo está y qué agente lo lee. Sin agente se dice claro, porque sin agente no llegan datos. */
export function TarjetaEnchufe({ nombre, estado, punto, agente, alPulsar }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nombre} · ${estado} · ${agente ? `Lo lee ${agente}` : "Sin agente asignado"}`}
      onPress={alPulsar}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, padding: 14, borderRadius: 18, backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde }}
    >
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: punto }} />
      <View style={{ flex: 1 }}>
        <Texto style={{ fontWeight: "700" }}>{nombre}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>{estado}</Texto>
        <Texto variante="secundario" color={agente ? colores.textoSecundario : colores.ambar} style={{ fontWeight: agente ? "400" : "700" }}>
          {agente ? `Lo lee: ${agente}` : "Sin agente asignado: no llegarán datos"}
        </Texto>
      </View>
      <Icono nombre="adelante" tamano={20} color={colores.textoSecundario} />
    </Pressable>
  );
}
