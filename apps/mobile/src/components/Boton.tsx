import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

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
};

export function Boton({ titulo, onPress, variante = "primario", seleccionado, cargando, deshabilitado, flex }: Props) {
  const lleno = variante === "primario" || seleccionado;
  return (
    <Pressable
      accessibilityRole="button"
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
        <Texto variante="subtitulo" color={lleno ? colores.sobrePrimario : colores.primario}>
          {titulo}
        </Texto>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: { minHeight: AREA_TOQUE_MIN + 4, paddingHorizontal: 20, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  lleno: { backgroundColor: colores.primario, borderColor: colores.primario },
  contorno: { backgroundColor: colores.tarjeta, borderColor: colores.primario },
});
