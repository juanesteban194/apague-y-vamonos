import { View } from "react-native";

import { colores, espacio, radios } from "@/theme";

import { SemaforoLuces } from "./SemaforoLuces";
import { Tarjeta } from "./Tarjeta";

const Bloque = ({ ancho, alto = 14 }: { ancho: number | `${number}%`; alto?: number }) => (
  <View style={{ width: ancho, height: alto, borderRadius: 7, backgroundColor: colores.tarjetaHundida }} />
);

/** Mientras llega el resumen: la silueta de Inicio (semáforo en reposo y la cifra de hoy), nunca una pantalla en blanco. */
export function InicioEsqueleto() {
  return (
    <View accessible accessibilityLabel="Cargando lo de hoy" style={{ gap: espacio.l }}>
      <Tarjeta style={{ borderRadius: radios.xl, padding: 20, flexDirection: "row", alignItems: "center", gap: 18 }}>
        <SemaforoLuces nivel={null} />
        <View style={{ flex: 1, gap: 10 }}>
          <Bloque ancho="40%" />
          <Bloque ancho="90%" alto={18} />
          <Bloque ancho="70%" alto={18} />
        </View>
      </Tarjeta>
      <Tarjeta style={{ borderRadius: radios.xl, padding: 20, gap: 12 }}>
        <Bloque ancho="45%" />
        <Bloque ancho="55%" alto={44} />
        <Bloque ancho="35%" />
      </Tarjeta>
    </View>
  );
}
