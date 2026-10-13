import { View } from "react-native";

import { TEMAS, type NombreTema } from "@/features/ayuda/temas";
import { colores, espacio } from "@/theme";

import { Icono } from "./Icono";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** La explicación completa de una sección: qué es, para qué sirve, cómo se usa. */
export function ContenidoAyuda({ tema }: { tema: NombreTema }) {
  const t = TEMAS[tema];
  return (
    <View style={{ gap: espacio.m }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icono nombre={t.icono} tamano={32} />
        <Texto variante="titulo" style={{ flex: 1 }}>{t.titulo}</Texto>
      </View>
      <Tarjeta>
        <Texto variante="subtitulo">Qué es</Texto>
        <Texto>{t.queEs}</Texto>
      </Tarjeta>
      <Tarjeta>
        <Texto variante="subtitulo">Para qué sirve</Texto>
        <Texto>{t.paraQueSirve}</Texto>
      </Tarjeta>
      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">Cómo se usa</Texto>
        {t.pasos.map((p, i) => (
          <View key={p} style={{ flexDirection: "row", gap: 10 }}>
            <Texto style={{ fontWeight: "800", width: 22 }}>{i + 1}.</Texto>
            <Texto style={{ flex: 1 }}>{p}</Texto>
          </View>
        ))}
      </Tarjeta>
      {"ojo" in t && (
        <Tarjeta style={{ backgroundColor: colores.ambarFondo }}>
          <Texto variante="subtitulo">Ojo</Texto>
          <Texto>{t.ojo}</Texto>
        </Tarjeta>
      )}
    </View>
  );
}
