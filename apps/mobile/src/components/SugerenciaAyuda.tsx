import { router } from "expo-router";
import { View } from "react-native";

import { marcarAyudaVista, useAyudaVista } from "@/features/ayuda/estado";
import { TEMAS, type NombreTema } from "@/features/ayuda/temas";
import { colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { Icono } from "./Icono";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** Invitación a leer cómo funciona la sección. Solo sale la primera vez que la persona entra; si la descarta o la abre, no vuelve.
 *  Siempre se puede volver con el botón «?» de la cabecera. */
export function SugerenciaAyuda({ tema }: { tema: NombreTema }) {
  const { cargada, vistas } = useAyudaVista();
  if (!cargada || vistas.includes(tema)) return null;
  const t = TEMAS[tema];
  return (
    <Tarjeta style={{ gap: espacio.s, backgroundColor: colores.verdeFondo, borderColor: colores.verdeSuave }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <Icono nombre="info" color={colores.verde} />
        <Texto style={{ fontWeight: "700", flex: 1 }}>¿Primera vez en {t.titulo}?</Texto>
      </View>
      <Texto color={colores.textoSecundario}>{t.queEs}</Texto>
      <View style={{ flexDirection: "row", gap: espacio.s }}>
        <Boton
          titulo="Ver cómo funciona"
          flex
          onPress={() => {
            void marcarAyudaVista(tema);
            router.push(`/ayuda/${tema}`);
          }}
        />
        <Boton titulo="Ahora no" variante="secundario" onPress={() => void marcarAyudaVista(tema)} />
      </View>
    </Tarjeta>
  );
}
