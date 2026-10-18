import type { ReactNode } from "react";
import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from "react-native";

import { AREA_TOQUE_MIN, BORDE_FINO, colores, radios } from "@/theme";

import { Texto } from "./Texto";

export type VarianteBoton = "primario" | "secundario" | "contorno" | "texto" | "peligro";

type Props = {
  titulo: string;
  onPress: () => void;
  /** primario: tinta llena (la acción principal, una por pantalla) · secundario: relleno suave · contorno: borde de un pelo
   *  · texto: solo el texto (acciones menores) · peligro: borrar, eliminar. */
  variante?: VarianteBoton;
  seleccionado?: boolean;
  cargando?: boolean;
  deshabilitado?: boolean;
  flex?: boolean;
  indicador?: string; // punto de color a la izquierda (estado de un enchufe)
  icono?: ReactNode; // ícono a la izquierda del título
  compacto?: boolean; // un poco más bajo, para filas de botones
};

const COLOR_TEXTO: Record<VarianteBoton, string> = {
  primario: colores.sobrePrimario,
  secundario: colores.texto,
  contorno: colores.texto,
  texto: colores.texto,
  peligro: colores.rojo,
};

export function Boton({ titulo, onPress, variante = "primario", seleccionado, cargando, deshabilitado, flex, indicador, icono, compacto }: Props) {
  const escala = useRef(new Animated.Value(1)).current;
  const lleno = variante === "primario" || seleccionado;
  const animar = (a: number) => Animated.spring(escala, { toValue: a, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, flex && { flex: 1 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={titulo} // el ícono es decorativo: el lector dice solo el título
        accessibilityState={{ disabled: !!deshabilitado || !!cargando, selected: seleccionado }}
        disabled={deshabilitado || cargando}
        onPress={onPress}
        onPressIn={() => animar(0.97)}
        onPressOut={() => animar(1)}
        style={({ pressed }) => [
          estilos.base,
          compacto && estilos.compacto,
          lleno ? estilos.primario : estilos[variante],
          pressed && { opacity: 0.86 },
          deshabilitado && { opacity: 0.42 },
        ]}
      >
        {cargando ? (
          <ActivityIndicator color={lleno ? colores.sobrePrimario : colores.texto} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {icono}
            {indicador && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: indicador }} />}
            <Texto variante="cuerpo" color={lleno ? colores.sobrePrimario : COLOR_TEXTO[variante]} style={{ fontWeight: "600", flexShrink: 1, textAlign: "center" }}>
              {titulo}
            </Texto>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: AREA_TOQUE_MIN + 8, paddingHorizontal: 20, borderRadius: radios.m, alignItems: "center", justifyContent: "center" },
  compacto: { minHeight: AREA_TOQUE_MIN, paddingHorizontal: 16 },
  primario: { backgroundColor: colores.primario },
  secundario: { backgroundColor: colores.tarjetaHundida },
  contorno: { backgroundColor: colores.tarjeta, borderWidth: BORDE_FINO * 2, borderColor: colores.bordeFuerte },
  texto: { backgroundColor: "transparent", paddingHorizontal: 8 },
  peligro: { backgroundColor: colores.rojoFondo },
});
