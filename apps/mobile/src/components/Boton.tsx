import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AREA_TOQUE_MIN, colores } from "@/theme";

import { Texto } from "./Texto";

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: "primario" | "secundario";
  seleccionado?: boolean;
  cargando?: boolean;
  deshabilitado?: boolean;
  flex?: boolean;
  indicador?: string; // punto de color a la izquierda (estado de un enchufe)
  icono?: ReactNode; // ícono a la izquierda del título
};

export function Boton({ titulo, onPress, variante = "primario", seleccionado, cargando, deshabilitado, flex, indicador, icono }: Props) {
  const lleno = variante === "primario" || seleccionado;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo} // el ícono es decorativo: el lector dice solo el título
      accessibilityState={{ disabled: !!deshabilitado || !!cargando, selected: seleccionado }}
      disabled={deshabilitado || cargando}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        lleno ? estilos.lleno : estilos.contorno,
        flex && { flex: 1 },
        (pressed || deshabilitado) && { opacity: 0.7 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={lleno ? colores.sobrePrimario : colores.primario} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {icono}
          {indicador && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: indicador }} />}
          <Texto variante="subtitulo" color={lleno ? colores.sobrePrimario : colores.primario} style={{ flexShrink: 1 }}>
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: AREA_TOQUE_MIN + 4, paddingHorizontal: 20, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  lleno: { backgroundColor: colores.primario, borderColor: colores.primario },
  contorno: { backgroundColor: colores.tarjeta, borderColor: colores.primario },
});
