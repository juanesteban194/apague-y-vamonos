/** La marca de «Apague y vámonos»: el mismo rayo del ícono de la app, para que la entrada se sienta la misma app que está en el teléfono. */
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

import { colores, sombras } from "@/theme";

import { Texto } from "./Texto";

/** Colores del ícono de la app (scripts/generar-iconos.js): tinta y el verde claro que se usa sobre fondos oscuros. Solo para la marca. */
const TINTA_MARCA = "#1B1A17";
const VERDE_MARCA = "#3CCB7F";

/** El rayo del ícono, en una caja de 0 a 1 (el mismo polígono que dibuja generar-iconos.js). */
const RAYO = "0.62,0.05 0.27,0.56 0.47,0.56 0.38,0.95 0.76,0.4 0.55,0.4 0.69,0.05";

/** El ícono de la app en pequeño: cuadrado redondeado de tinta con el rayo verde. Decorativo: el nombre va al lado. */
export function SelloMarca({ tamano = 64 }: { tamano?: number }) {
  return (
    <View
      aria-hidden
      style={{
        width: tamano,
        height: tamano,
        borderRadius: Math.round(tamano * 0.27),
        backgroundColor: TINTA_MARCA,
        alignItems: "center",
        justifyContent: "center",
        ...sombras.media,
      }}
    >
      <Svg width={tamano * 0.74} height={tamano * 0.74} viewBox="0 0 1 1">
        <Polygon points={RAYO} fill={VERDE_MARCA} />
      </Svg>
    </View>
  );
}

/** Momento de marca de la entrada: el sello, el nombre y una línea con la promesa del producto. */
export function MarcaEncabezado({ lema }: { lema: string }) {
  return (
    <View style={{ gap: 20 }}>
      <SelloMarca />
      <View style={{ gap: 8 }}>
        <Texto variante="tituloGrande" accessibilityRole="header">
          Apague y vámonos
        </Texto>
        <Texto variante="cuerpo" color={colores.textoSecundario} style={{ fontSize: 17, lineHeight: 25 }}>
          {lema}
        </Texto>
      </View>
    </View>
  );
}
