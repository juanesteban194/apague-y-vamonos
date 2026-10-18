import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colores, espacio } from "@/theme";

import { Texto } from "./Texto";

type Props = {
  children: ReactNode;
  refrescando?: boolean;
  alRefrescar?: () => void;
  /** Título grande de la pantalla (estilo de las apps de Apple). Opcional: algunas pantallas arman su propio encabezado. */
  titulo?: string;
  subtitulo?: string;
  /** Algo a la derecha del título (por ejemplo, un botón de ayuda). */
  accion?: ReactNode;
  /** Con cabecera del navegador encima no hace falta el margen superior del sistema. */
  conCabecera?: boolean;
};

export function Pantalla({ children, refrescando, alRefrescar, titulo, subtitulo, accion, conCabecera }: Props) {
  return (
    <SafeAreaView edges={conCabecera ? [] : ["top"]} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: espacio.s, paddingBottom: 40, gap: espacio.l }}
        refreshControl={alRefrescar ? <RefreshControl refreshing={!!refrescando} onRefresh={alRefrescar} tintColor={colores.textoSecundario} /> : undefined}
        showsVerticalScrollIndicator={false}
      >
        {titulo && (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: espacio.m, marginTop: espacio.s, marginBottom: espacio.xs }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Texto variante="tituloGrande" accessibilityRole="header">
                {titulo}
              </Texto>
              {subtitulo && <Texto color={colores.textoSecundario}>{subtitulo}</Texto>}
            </View>
            {accion}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
