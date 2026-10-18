import { View } from "react-native";

import type { Equivalencia } from "@/api/tipos";
import { colores } from "@/theme";

import type { NombreIcono } from "./Icono";
import { IconoEnCaja } from "./Primitivos";
import { Texto } from "./Texto";

/** El backend nombra el ícono con una palabra corta; aquí se traduce al significado que entiende `Icono`. */
const ICONOS: Record<string, NombreIcono> = { tv: "tv", plug: "celular", burger: "hamburguesa", milk: "leche" };

/** «Es como dejar el televisor de la sala prendido 21 horas.» con su ícono en caja. La primera va un poco más marcada. */
export function FilaEquivalencia({ equivalencia, primera }: { equivalencia: Equivalencia; primera: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <IconoEnCaja nombre={ICONOS[equivalencia.icono] ?? "rayo"} tono="neutro" tamano={38} />
      <Texto variante="cuerpo" color={primera ? colores.texto : colores.textoSecundario} style={{ flex: 1, fontWeight: primera ? "500" : "400" }}>
        {equivalencia.texto}
      </Texto>
    </View>
  );
}
