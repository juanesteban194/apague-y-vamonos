import { router } from "expo-router";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { Icono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { IconoEnCaja, Separador } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { ORDEN_TEMAS, TEMAS, type NombreTema } from "@/features/ayuda/temas";
import { colores, espacio } from "@/theme";

/** Los temas agrupados igual que en Explorar, para encontrarlos donde uno los busca. Un tema nuevo que no esté aquí sale en «Más». */
const GRUPOS: { titulo: string; temas: NombreTema[] }[] = [
  { titulo: "Lo básico", temas: ["inicio", "avisos"] },
  { titulo: "Mis dispositivos", temas: ["enchufes", "agentes", "rutinas"] },
  { titulo: "Mi plata", temas: ["facturas", "prepago"] },
  { titulo: "Ahorra", temas: ["consejos", "simulador"] },
  { titulo: "Mi cuenta", temas: ["casas"] },
];

function grupos() {
  const usados = new Set(GRUPOS.flatMap((g) => g.temas));
  const sueltos = ORDEN_TEMAS.filter((id) => !usados.has(id));
  return sueltos.length ? [...GRUPOS, { titulo: "Más", temas: sueltos }] : GRUPOS;
}

function FilaTema({ id }: { id: NombreTema }) {
  const t = TEMAS[id];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.titulo}. ${t.queEs}`}
      onPress={() => router.push(`/ayuda/${id}`)}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? "rgba(20,19,17,0.04)" : "transparent" })}
    >
      <IconoEnCaja nombre={t.icono} tamano={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Texto style={{ fontWeight: "500" }}>{t.titulo}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario} numberOfLines={2}>
          {t.queEs}
        </Texto>
      </View>
      <Icono nombre="adelante" tamano={18} color="rgba(20,19,17,0.3)" />
    </Pressable>
  );
}

/** Todas las explicaciones juntas, por tema. */
export default function Instrucciones() {
  return (
    <Pantalla conCabecera>
      <Texto color={colores.textoSecundario}>Elige un tema para ver qué hace y cómo se usa.</Texto>
      {grupos().map((g) => (
        <View key={g.titulo} style={{ gap: espacio.s }}>
          <Texto variante="secundario" color={colores.textoSecundario} accessibilityRole="header" style={{ fontWeight: "600", marginLeft: 4 }}>
            {g.titulo}
          </Texto>
          <Tarjeta style={{ padding: 0, gap: 0, overflow: "hidden" }}>
            {g.temas.map((id, i) => (
              <Fragment key={id}>
                {i > 0 && <Separador sangria={66} />}
                <FilaTema id={id} />
              </Fragment>
            ))}
          </Tarjeta>
        </View>
      ))}
    </Pantalla>
  );
}
