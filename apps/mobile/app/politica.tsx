import { View } from "react-native";

import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { POLITICA, VERSION_POLITICA } from "@/features/datos/politica";
import { colores, espacio } from "@/theme";

/** Se puede leer antes de crear la cuenta (por eso no está detrás del inicio de sesión). */
export default function Politica() {
  return (
    <Pantalla>
      <Texto variante="titulo">Política de tratamiento de datos</Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>Ley 1581 de 2012 · versión {VERSION_POLITICA}</Texto>
      {POLITICA.map((s) => (
        <Tarjeta key={s.titulo} style={{ gap: espacio.s }}>
          <Texto variante="subtitulo" accessibilityRole="header">{s.titulo}</Texto>
          {s.parrafos?.map((p) => <Texto key={p}>{p}</Texto>)}
          {s.puntos?.map((p) => (
            <View key={p} style={{ flexDirection: "row", gap: 8 }}>
              <Texto style={{ width: 14 }}>•</Texto>
              <Texto style={{ flex: 1 }}>{p}</Texto>
            </View>
          ))}
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
