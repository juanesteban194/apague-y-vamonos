import type { ReactNode } from "react";
import { useRef } from "react";
import { Animated, PanResponder, Platform, Pressable, View } from "react-native";

import { seleccionar } from "@/lib/haptica";
import { AREA_TOQUE_MIN, colores } from "@/theme";

import { Icono } from "./Icono";
import { Texto } from "./Texto";

const ANCHO_BOTON = 96; // el botón rojo que aparece al deslizar
const NATIVO = Platform.OS !== "web";

type Props = {
  children: ReactNode;
  /** Se llama al tocar el botón rojo o al deslizar del todo. Devuelve si se eliminó (si no, la fila vuelve a su sitio). */
  alEliminar: () => Promise<boolean>;
  /** Para el lector de pantalla, que no puede deslizar: «Eliminar el aviso …». */
  etiquetaEliminar: string;
  testID?: string;
};

/** Fila que se desliza a la izquierda y deja ver «Eliminar», como en Mail o WhatsApp. Hecha con PanResponder y Animated
 *  (sin librerías de gestos): funciona igual en iOS, Android y web. Solo toma el gesto si es claramente horizontal,
 *  así la lista se sigue desplazando hacia arriba y abajo. */
export function FilaDeslizable({ children, alEliminar, etiquetaEliminar, testID }: Props) {
  const x = useRef(new Animated.Value(0)).current;
  const abierta = useRef(false);
  const ancho = useRef(0);

  const ir = (destino: number) => Animated.spring(x, { toValue: destino, useNativeDriver: NATIVO, speed: 22, bounciness: 0 }).start();
  const cerrar = () => {
    abierta.current = false;
    ir(0);
  };
  async function eliminar() {
    const listo = await alEliminar();
    if (!listo) cerrar();
  }

  const gesto = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const base = abierta.current ? -ANCHO_BOTON : 0;
        x.setValue(Math.min(0, base + g.dx)); // solo hacia la izquierda
      },
      onPanResponderRelease: (_, g) => {
        const recorrido = (abierta.current ? -ANCHO_BOTON : 0) + g.dx;
        if (ancho.current > 0 && recorrido < -ancho.current * 0.6) {
          // Deslizó casi toda la fila: pregunta de una vez
          ir(-ANCHO_BOTON);
          abierta.current = true;
          void eliminar();
        } else if (recorrido < -ANCHO_BOTON / 2 || g.vx < -0.5) {
          if (!abierta.current) seleccionar();
          abierta.current = true;
          ir(-ANCHO_BOTON);
        } else cerrar();
      },
      onPanResponderTerminate: () => cerrar(),
    }),
  ).current;

  return (
    <View
      testID={testID}
      onLayout={(e) => (ancho.current = e.nativeEvent.layout.width)}
      accessibilityActions={[{ name: "eliminar", label: etiquetaEliminar }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === "eliminar" && void eliminar()}
      style={{ overflow: "hidden" }}
    >
      {/* El botón rojo, detrás de la fila */}
      <View style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: ANCHO_BOTON, backgroundColor: colores.rojo }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={etiquetaEliminar}
          onPress={() => void eliminar()}
          style={({ pressed }) => ({ flex: 1, minHeight: AREA_TOQUE_MIN, alignItems: "center", justifyContent: "center", gap: 4, opacity: pressed ? 0.8 : 1 })}
        >
          <Icono nombre="borrar" tamano={22} color={colores.sobreOscuro} />
          <Texto variante="secundario" color={colores.sobreOscuro} style={{ fontWeight: "600" }}>
            Eliminar
          </Texto>
        </Pressable>
      </View>
      {/* En la web, arrastrar con el mouse no debe seleccionar el texto */}
      <Animated.View {...gesto.panHandlers} style={[{ backgroundColor: colores.tarjeta, transform: [{ translateX: x }] }, !NATIVO && ({ userSelect: "none" } as object)]}>
        {children}
      </Animated.View>
    </View>
  );
}
