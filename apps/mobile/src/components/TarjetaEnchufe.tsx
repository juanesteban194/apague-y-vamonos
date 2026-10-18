import { Pressable, View } from "react-native";

import { colores } from "@/theme";

import { PuntoSobreIcono } from "./GestionPiezas";
import { Icono, type NombreIcono } from "./Icono";
import { IconoEnCaja } from "./Primitivos";
import { Texto } from "./Texto";

type Props = {
  nombre: string;
  estado: string; // «Conectado», «Sin señal desde hace 2 h»…
  punto: string; // color del semáforo
  agente: string | null; // nombre del agente que lo lee; null si no tiene
  alPulsar: () => void;
  icono?: NombreIcono; // lo que tiene conectado (nevera, televisor…); por defecto, un enchufe
};

/** Un enchufe en la lista (fila de una lista agrupada): qué tiene conectado, cómo está y qué agente lo lee.
 *  El punto de color sobre el ícono dice el estado de un vistazo. Sin agente se dice claro, porque sin agente no llegan datos. */
export function TarjetaEnchufe({ nombre, estado, punto, agente, alPulsar, icono = "enchufeLinea" }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nombre} · ${estado} · ${agente ? `Lo lee ${agente}` : "Sin agente asignado"}`}
      onPress={alPulsar}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 72,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: pressed ? "rgba(20,19,17,0.04)" : "transparent",
      })}
    >
      <PuntoSobreIcono color={punto}>
        <IconoEnCaja nombre={icono} tamano={40} />
      </PuntoSobreIcono>
      <View style={{ flex: 1, gap: 1 }}>
        <Texto style={{ fontWeight: "600" }} numberOfLines={1}>
          {nombre}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {estado}
        </Texto>
        {agente ? (
          <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={1}>
            {`Lo lee: ${agente}`}
          </Texto>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Icono nombre="alertaLinea" tamano={16} color={colores.ambar} />
            <Texto variante="secundario" color={colores.ambar} style={{ fontWeight: "500", flexShrink: 1 }}>
              Sin agente asignado: no llegarán datos
            </Texto>
          </View>
        )}
      </View>
      <Icono nombre="adelante" tamano={18} color="rgba(20,19,17,0.3)" />
    </Pressable>
  );
}
