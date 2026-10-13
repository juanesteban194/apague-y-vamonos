import { router } from "expo-router";
import { Pressable } from "react-native";

import type { NombreTema } from "@/features/ayuda/temas";
import { AREA_TOQUE_MIN } from "@/theme";

import { Icono } from "./Icono";

/** El «?» de la cabecera de cada sección: abre su explicación. */
export function BotonAyuda({ tema }: { tema: NombreTema }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ayuda de esta sección"
      onPress={() => router.push(`/ayuda/${tema}`)}
      style={{ minWidth: AREA_TOQUE_MIN, minHeight: AREA_TOQUE_MIN, alignItems: "center", justifyContent: "center" }}
    >
      <Icono nombre="ayuda" tamano={26} />
    </Pressable>
  );
}
