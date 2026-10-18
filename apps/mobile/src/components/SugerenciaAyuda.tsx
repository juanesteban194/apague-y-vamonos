import { router } from "expo-router";
import { View } from "react-native";

import { marcarAyudaVista, useAyudaVista } from "@/features/ayuda/estado";
import { TEMAS, type NombreTema } from "@/features/ayuda/temas";
import { colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { IconoEnCaja } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** Invitación a leer cómo funciona la sección. Solo sale la primera vez que la persona entra; si la descarta o la abre, no vuelve.
 *  Siempre se puede volver con el botón «?» de la cabecera. Discreta: no compite con la acción principal de la pantalla. */
export function SugerenciaAyuda({ tema }: { tema: NombreTema }) {
  const { cargada, vistas } = useAyudaVista();
  if (!cargada || vistas.includes(tema)) return null;
  const t = TEMAS[tema];
  return (
    <Tarjeta style={{ gap: espacio.m, padding: 16 }}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
        <IconoEnCaja nombre="chispa" tono="verde" tamano={36} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto style={{ fontWeight: "600" }}>¿Primera vez en {t.titulo}?</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {t.queEs}
          </Texto>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: espacio.s, marginLeft: 50 }}>
        <Boton
          titulo="Ver cómo funciona"
          variante="secundario"
          compacto
          flex
          onPress={() => {
            void marcarAyudaVista(tema);
            router.push(`/ayuda/${tema}`);
          }}
        />
        <Boton titulo="Ahora no" variante="texto" compacto onPress={() => void marcarAyudaVista(tema)} />
      </View>
    </Tarjeta>
  );
}
