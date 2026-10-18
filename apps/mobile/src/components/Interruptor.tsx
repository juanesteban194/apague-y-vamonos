import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Platform, Pressable, View } from "react-native";

import { seleccionar } from "@/lib/haptica";
import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Icono } from "./Icono";
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

const RIEL = { ancho: 52, alto: 32, margen: 3 };
const BOTON = RIEL.alto - RIEL.margen * 2;
const RECORRIDO = RIEL.ancho - BOTON - RIEL.margen * 2;

/** Interruptor grande (mockup: «Está prendido · Toca para apagarlo desde aquí»). Toda la fila es el área de toque.
 *  A la izquierda, el ícono de encendido en verde (prendido) o gris (apagado); a la derecha, un riel como el de iOS. */
export function Interruptor({
  encendido,
  cargando,
  alCambiar,
  etiquetaEncendido = "Está prendido",
  etiquetaApagado = "Está apagado",
  ayudaEncendido = "Toca para apagarlo desde aquí",
  ayudaApagado = "Toca para prenderlo desde aquí",
}: Props) {
  const sinDatos = encendido == null;
  const prendido = encendido === true;
  const posicion = useRef(new Animated.Value(prendido ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(posicion, { toValue: prendido ? 1 : 0, useNativeDriver: Platform.OS !== "web", speed: 18, bounciness: 4 }).start();
  }, [prendido, posicion]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: prendido, disabled: sinDatos || !!cargando, busy: !!cargando }}
      accessibilityLabel={sinDatos ? "Sin datos del enchufe" : prendido ? etiquetaEncendido : etiquetaApagado}
      disabled={sinDatos || cargando}
      onPress={() => {
        seleccionar();
        alCambiar(!prendido);
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: espacio.m,
        minHeight: AREA_TOQUE_MIN + 20,
        opacity: sinDatos ? 0.6 : pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: prendido ? colores.verdeFondo : colores.tarjetaHundida,
        }}
      >
        <Icono nombre="apagar" tamano={20} color={prendido ? colores.verde : colores.apagado} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="cuerpo" style={{ fontWeight: "600" }}>
          {sinDatos ? "Sin datos del enchufe" : prendido ? etiquetaEncendido : etiquetaApagado}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {sinDatos ? "Cuando el enchufe mande datos, podrás controlarlo desde aquí." : prendido ? ayudaEncendido : ayudaApagado}
        </Texto>
      </View>
      <View
        style={{
          width: RIEL.ancho,
          height: RIEL.alto,
          borderRadius: RIEL.alto / 2,
          padding: RIEL.margen,
          backgroundColor: prendido ? colores.semaforoVerde : colores.interruptorApagado,
        }}
      >
        <Animated.View
          style={{
            width: BOTON,
            height: BOTON,
            borderRadius: BOTON / 2,
            backgroundColor: colores.tarjeta,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0px 1px 1px rgba(0,0,0,0.06), 0px 3px 8px rgba(0,0,0,0.15)",
            transform: [{ translateX: posicion.interpolate({ inputRange: [0, 1], outputRange: [0, RECORRIDO] }) }],
          }}
        >
          {cargando && <ActivityIndicator size="small" color={colores.textoSecundario} />}
        </Animated.View>
      </View>
    </Pressable>
  );
}
