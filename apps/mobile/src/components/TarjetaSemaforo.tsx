import { View } from "react-native";

import type { Semaforo } from "@/api/tipos";
import { colores } from "@/theme";

import { Boton } from "./Boton";
import { SemaforoLuces } from "./SemaforoLuces";
import { Texto } from "./Texto";

const ESTILO = {
  verde: { fondo: colores.verdeFondo, borde: "rgba(21,138,78,0.28)", acento: colores.verde },
  amarillo: { fondo: colores.ambarFondo, borde: "rgba(201,134,11,0.28)", acento: colores.ambar },
  rojo: { fondo: colores.rojoFondo, borde: "rgba(198,64,44,0.28)", acento: colores.rojo },
} as const;

type Props = { semaforo: Semaforo; alAnotarFacturas: () => void; alAnotarMedidor: () => void };

/** La tarjeta principal de Inicio (mockup): ¿va por encima o por debajo de lo normal? Si falta un dato, dice cuál y lleva a anotarlo. */
export function TarjetaSemaforo({ semaforo: s, alAnotarFacturas, alAnotarMedidor }: Props) {
  if (s.estado !== "ok" || !s.nivel) {
    return (
      <View style={{ backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 22, padding: 20, gap: 8 }}>
        <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
          {s.titulo}
        </Texto>
        <Texto variante="subtitulo" style={{ fontWeight: "800", fontSize: 20, lineHeight: 26 }}>
          {s.mensaje}
        </Texto>
        <View style={{ marginTop: 6 }}>
          {s.estado === "sin_historial" ? (
            <Boton titulo="Anotar mis facturas" onPress={alAnotarFacturas} />
          ) : (
            <Boton titulo="Anotar lectura del medidor" onPress={alAnotarMedidor} />
          )}
        </View>
      </View>
    );
  }
  const e = ESTILO[s.nivel];
  return (
    <View
      accessible
      accessibilityLabel={`${s.titulo}. ${s.mensaje}`}
      style={{ backgroundColor: e.fondo, borderWidth: 1, borderColor: e.borde, borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", gap: 18 }}
    >
      <SemaforoLuces nivel={s.nivel} />
      <View style={{ flex: 1, gap: 6 }}>
        <Texto variante="secundario" color={e.acento} style={{ fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
          {s.titulo}
        </Texto>
        <Texto variante="subtitulo" style={{ fontWeight: "800", fontSize: 21, lineHeight: 27 }}>
          {s.mensaje}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          Lo compara con el promedio de sus últimas facturas de EPM.
        </Texto>
      </View>
    </View>
  );
}
