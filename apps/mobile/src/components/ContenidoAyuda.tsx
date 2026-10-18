import { View } from "react-native";

import { TEMAS, type NombreTema } from "@/features/ayuda/temas";
import { colores, espacio } from "@/theme";

import { Pasos } from "./GestionPiezas";
import { Icono } from "./Icono";
import { IconoEnCaja, Separador } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** Un apartado de la explicación: título corto y texto, con lectura cómoda (renglón amplio). */
function Apartado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Texto variante="etiqueta" color={colores.textoSecundario} accessibilityRole="header">
        {titulo}
      </Texto>
      <Texto style={{ fontSize: 17, lineHeight: 26 }}>{texto}</Texto>
    </View>
  );
}

/** La explicación completa de una sección: qué es, para qué sirve, cómo se usa y, si hace falta, qué tener en cuenta. */
export function ContenidoAyuda({ tema }: { tema: NombreTema }) {
  const t = TEMAS[tema];
  return (
    <View style={{ gap: espacio.l }}>
      <View style={{ gap: espacio.m, marginTop: espacio.xs, marginBottom: espacio.xs }}>
        <IconoEnCaja nombre={t.icono} tamano={56} />
        <Texto variante="tituloGrande" accessibilityRole="header">
          {t.titulo}
        </Texto>
      </View>

      <Tarjeta style={{ gap: espacio.l, padding: 20 }}>
        <Apartado titulo="Qué es" texto={t.queEs} />
        <Separador />
        <Apartado titulo="Para qué sirve" texto={t.paraQueSirve} />
      </Tarjeta>

      <Tarjeta style={{ gap: espacio.l, padding: 20 }}>
        <Texto variante="subtitulo" accessibilityRole="header">
          Cómo se usa
        </Texto>
        <Pasos pasos={t.pasos} />
      </Tarjeta>

      {"ojo" in t && (
        <Tarjeta variante="ambar" style={{ gap: espacio.s, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icono nombre="alertaLinea" tamano={22} color={colores.ambar} />
            <Texto variante="subtitulo" color={colores.ambar} accessibilityRole="header">
              Ojo
            </Texto>
          </View>
          <Texto style={{ lineHeight: 24 }}>{t.ojo}</Texto>
        </Tarjeta>
      )}
    </View>
  );
}
