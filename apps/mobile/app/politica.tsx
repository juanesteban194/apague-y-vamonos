import { View } from "react-native";

import { Pantalla } from "@/components/Pantalla";
import { IconoEnCaja, Separador } from "@/components/Primitivos";
import { Texto } from "@/components/Texto";
import { POLITICA, VERSION_POLITICA } from "@/features/datos/politica";
import { colores, espacio } from "@/theme";

/** Interlineado de lectura: un poco más abierto que el cuerpo normal, como en un buen texto largo. */
const LECTURA = { fontSize: 16, lineHeight: 25 } as const;

/** Se puede leer antes de crear la cuenta (por eso no está detrás del inicio de sesión).
 *  Se presenta como un texto para leer con calma: secciones numeradas, párrafos aireados y un ancho de línea cómodo. */
export default function Politica() {
  return (
    <Pantalla conCabecera>
      <View style={{ width: "100%", maxWidth: 600, alignSelf: "center", gap: espacio.xl, paddingTop: espacio.s }}>
        <View style={{ gap: espacio.l }}>
          <IconoEnCaja nombre="escudo" tono="verde" tamano={52} />
          <View style={{ gap: espacio.s }}>
            <Texto variante="tituloGrande" accessibilityRole="header">
              Política de tratamiento de datos
            </Texto>
            <Texto variante="secundario" color={colores.textoSecundario}>
              Ley 1581 de 2012 · versión {VERSION_POLITICA}
            </Texto>
          </View>
        </View>

        {POLITICA.map((s, i) => (
          <View key={s.titulo} style={{ gap: espacio.xl }}>
            <Separador />
            <View style={{ gap: espacio.m }}>
              <View style={{ gap: 2 }}>
                <Texto variante="etiqueta" color={colores.textoSecundario}>
                  {String(i + 1).padStart(2, "0")}
                </Texto>
                <Texto variante="subtitulo" accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26 }}>
                  {s.titulo}
                </Texto>
              </View>
              {s.parrafos?.map((p) => (
                <Texto key={p} style={LECTURA}>
                  {p}
                </Texto>
              ))}
              {s.puntos && (
                <View style={{ gap: espacio.m }}>
                  {s.puntos.map((p) => (
                    <View key={p} style={{ flexDirection: "row", gap: 14 }}>
                      <View aria-hidden style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colores.textoSecundario, marginTop: (LECTURA.lineHeight - 5) / 2, marginLeft: 2 }} />
                      <Texto style={[LECTURA, { flex: 1 }]}>{p}</Texto>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    </Pantalla>
  );
}
