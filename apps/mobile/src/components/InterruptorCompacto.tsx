import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Platform, Pressable, View } from "react-native";

import { seleccionar } from "@/lib/haptica";
import { AREA_TOQUE_MIN, colores } from "@/theme";

type Props = {
  nombre: string;
  encendido: boolean | null; // null: aún no hay datos del enchufe
  cargando?: boolean;
  alCambiar: (encender: boolean) => void;
};

const ANCHO = 51;
const ALTO = 31;
const POMO = 27;
const RECORRIDO = ANCHO - POMO - 4;

/** El interruptor de prender y apagar de una fila: proporciones del de iOS (51 × 31), verde = prendido, y un área de toque ≥ 44 px. */
export function InterruptorCompacto({ nombre, encendido, cargando, alCambiar }: Props) {
  const sinDatos = encendido == null;
  const prendido = encendido === true;
  const posicion = useRef(new Animated.Value(prendido ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(posicion, { toValue: prendido ? 1 : 0, useNativeDriver: Platform.OS !== "web", speed: 22, bounciness: 4 }).start();
  }, [prendido, posicion]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={sinDatos ? `${nombre}: sin datos, no se puede controlar todavía` : prendido ? `Apagar ${nombre}` : `Prender ${nombre}`}
      accessibilityState={{ checked: prendido, disabled: sinDatos || !!cargando, busy: !!cargando }}
      disabled={sinDatos || cargando}
      onPress={() => {
        seleccionar();
        alCambiar(!prendido);
      }}
      hitSlop={6}
      style={({ pressed }) => ({ minWidth: ANCHO + 12, minHeight: AREA_TOQUE_MIN + 8, alignItems: "center", justifyContent: "center", opacity: sinDatos ? 0.45 : pressed ? 0.8 : 1 })}
    >
      <View style={{ width: ANCHO, height: ALTO, borderRadius: ALTO / 2, padding: 2, justifyContent: "center", backgroundColor: prendido ? colores.semaforoVerde : colores.interruptorApagado }}>
        <Animated.View
          style={{
            width: POMO,
            height: POMO,
            borderRadius: POMO / 2,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0px 2px 5px rgba(0,0,0,0.14), 0px 0px 1px rgba(0,0,0,0.16)",
            transform: [{ translateX: posicion.interpolate({ inputRange: [0, 1], outputRange: [0, RECORRIDO] }) }],
          }}
        >
          {cargando && <ActivityIndicator size="small" color={colores.textoSecundario} />}
        </Animated.View>
      </View>
    </Pressable>
  );
}
