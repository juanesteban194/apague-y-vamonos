import { View } from "react-native";

import type { Semaforo } from "@/api/tipos";
import { BORDE_FINO, colores, espacio, radios, sombras } from "@/theme";

import { Boton } from "./Boton";
import { SemaforoLuces } from "./SemaforoLuces";
import { Texto } from "./Texto";

const ESTILO = {
  verde: { fondo: colores.verdeFondo, borde: "rgba(14,107,58,0.14)", acento: colores.verde },
  amarillo: { fondo: colores.ambarFondo, borde: "rgba(138,101,20,0.16)", acento: colores.ambar },
  rojo: { fondo: colores.rojoFondo, borde: "rgba(185,58,40,0.16)", acento: colores.rojo },
  // Falta un dato: tarjeta blanca y semáforo en reposo; el color aparece cuando hay con qué compararlo.
  apagado: { fondo: colores.tarjeta, borde: colores.borde, acento: colores.textoSecundario },
} as const;

type Props = { semaforo: Semaforo; alAnotarFacturas: () => void; alAnotarMedidor: () => void };

/** La protagonista de Inicio: ¿vas por encima o por debajo de lo normal? El semáforo siempre se ve; si falta un dato, sale en reposo
 *  y la tarjeta dice cuál falta y lleva a anotarlo. */
export function TarjetaSemaforo({ semaforo: s, alAnotarFacturas, alAnotarMedidor }: Props) {
  const nivel = s.estado === "ok" && s.nivel ? s.nivel : null;
  const e = ESTILO[nivel ?? "apagado"];
  return (
    <View
      style={{
        backgroundColor: e.fondo,
        borderWidth: BORDE_FINO,
        borderColor: e.borde,
        borderRadius: radios.xl,
        padding: 20,
        gap: 18,
        ...(nivel ? sombras.suave : sombras.media),
      }}
    >
      <View accessible accessibilityLabel={`${s.titulo}. ${s.mensaje}`} style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
        <SemaforoLuces nivel={nivel} />
        <View style={{ flex: 1, gap: 6 }}>
          <Texto variante="etiqueta" color={e.acento}>
            {s.titulo}
          </Texto>
          <Texto variante="subtitulo" style={{ fontSize: 19, lineHeight: 25, letterSpacing: -0.3 }}>
            {s.mensaje}
          </Texto>
          {nivel && (
            <Texto variante="secundario" color={colores.textoSecundario} style={{ marginTop: espacio.xs / 2 }}>
              Comparado con el promedio de tus facturas de EPM.
            </Texto>
          )}
        </View>
      </View>
      {!nivel &&
        (s.estado === "sin_historial" ? (
          <Boton titulo="Anotar mis facturas" onPress={alAnotarFacturas} />
        ) : (
          <Boton titulo="Anotar lectura del medidor" onPress={alAnotarMedidor} />
        ))}
    </View>
  );
}
