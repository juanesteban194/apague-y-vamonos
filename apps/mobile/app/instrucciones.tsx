import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { Icono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { Texto } from "@/components/Texto";
import { ORDEN_TEMAS, TEMAS } from "@/features/ayuda/temas";
import { colores, espacio } from "@/theme";

/** Todas las explicaciones juntas, por tema. */
export default function Instrucciones() {
  return (
    <Pantalla>
      <Texto color={colores.textoSecundario}>Elige un tema para ver qué hace y cómo se usa.</Texto>
      <View style={{ gap: espacio.s }}>
        {ORDEN_TEMAS.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            onPress={() => router.push(`/ayuda/${id}`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, padding: 14, borderRadius: 18, backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde }}
          >
            <Icono nombre={TEMAS[id].icono} tamano={28} />
            <View style={{ flex: 1 }}>
              <Texto style={{ fontWeight: "700" }}>{TEMAS[id].titulo}</Texto>
              <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={2}>{TEMAS[id].queEs}</Texto>
            </View>
            <Icono nombre="adelante" tamano={20} color={colores.textoSecundario} />
          </Pressable>
        ))}
      </View>
    </Pantalla>
  );
}
