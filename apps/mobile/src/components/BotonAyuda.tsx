import { router } from "expo-router";
import { Pressable, View } from "react-native";

import type { NombreTema } from "@/features/ayuda/temas";
import { AREA_TOQUE_MIN, BORDE_FINO, colores } from "@/theme";

import { Texto } from "./Texto";

/** El «?» de la cabecera de cada sección: abre su explicación. Un círculo suave con el signo, para que no pese más que el título. */
export function BotonAyuda({ tema }: { tema: NombreTema }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ayuda de esta sección"
      onPress={() => router.push(`/ayuda/${tema}`)}
      hitSlop={6}
      style={({ pressed }) => ({ minWidth: AREA_TOQUE_MIN, minHeight: AREA_TOQUE_MIN, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colores.tarjeta, borderWidth: BORDE_FINO, borderColor: colores.bordeFuerte, alignItems: "center", justifyContent: "center" }}>
        <Texto maxFontSizeMultiplier={1.2} style={{ fontWeight: "600", lineHeight: 20 }}>
          ?
        </Texto>
      </View>
    </Pressable>
  );
}
