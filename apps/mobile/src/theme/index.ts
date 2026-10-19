/**
 * Sistema de diseño de «Apague y vámonos».
 *
 * Reglas de accesibilidad (requisitos del proyecto): texto ≥ 15 px y áreas de toque ≥ 44 px (una prueba lo vigila).
 * Lenguaje visual: papel cálido de fondo, tarjetas blancas con borde de un pelo y sombra apenas perceptible, tinta casi negra para las
 * acciones y el semáforo como único color vivo. Tipografía Inter (la de los productos digitales de referencia) con interletrado negativo
 * en los tamaños grandes, como en los sistemas de Apple. Peso máximo 700: nada se ve «gritado».
 */
import { StyleSheet } from "react-native";

export const AREA_TOQUE_MIN = 44;
export const TEXTO_MIN = 15;

/** Colores. Contrastes sobre blanco: texto 18:1, secundario 5,4:1; los textos de color usan las variantes oscuras (verde, ámbar, rojo). */
export const colores = {
  // Superficies
  fondo: "#F6F4EF", // papel cálido
  fondoElevado: "#FBFAF7",
  tarjeta: "#FFFFFF",
  tarjetaHundida: "#F0EDE7", // campos, controles segmentados, botones secundarios
  borde: "rgba(20,19,17,0.08)", // borde de un pelo
  bordeFuerte: "rgba(20,19,17,0.16)",
  separador: "rgba(20,19,17,0.07)",

  // Texto
  texto: "#141311",
  textoSecundario: "#6B675F",

  // Acciones: tinta oscura (como las pestañas y los selectores del mockup)
  primario: "#141311",
  sobrePrimario: "#FAF8F4",

  // Superficie oscura (tarjetas protagonistas, por ejemplo «Vale la pena pensarlo»)
  oscuro: "#18171A",
  sobreOscuro: "#F7F5F0",
  sobreOscuroSecundario: "rgba(247,245,240,0.72)",

  // Semáforo y estados. Los de texto son las variantes oscuras; los «semaforo*» son los colores vivos de las luces.
  verde: "#0E6B3A",
  ambar: "#8A6514",
  rojo: "#B93A28",
  semaforoVerde: "#1E9E5A",
  semaforoAmbar: "#F2B22E",
  semaforoRojo: "#D9452F",
  verdeSuave: "#A9D8BC",
  verdeFondo: "#EAF5EE",
  ambarFondo: "#FCF3DE",
  rojoFondo: "#FBEAE6",

  apagado: "#6B675F",
  interruptorApagado: "#D3CEC4",
} as const;

/** Etiqueta RETIQ A–G (colores del mockup). */
export const coloresRetiq = { A: "#1E9E5A", B: "#4FA05C", C: "#8FB03F", D: "#E0B015", E: "#E08A16", F: "#D3612A", G: "#C6402C" } as const;

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const radios = { s: 10, m: 14, l: 20, xl: 28, total: 999 } as const;

/** Borde de un pelo: el más fino que dibuja la pantalla (0,33 px en un iPhone). */
export const BORDE_FINO = StyleSheet.hairlineWidth;

/** Sombras con la propiedad estándar `boxShadow` (iOS, Android con la nueva arquitectura y web). Suaves: dan profundidad sin ruido. */
export const sombras = {
  ninguna: {},
  suave: { boxShadow: "0px 1px 2px rgba(26,23,18,0.04), 0px 6px 18px rgba(26,23,18,0.05)" },
  media: { boxShadow: "0px 2px 4px rgba(26,23,18,0.05), 0px 12px 28px rgba(26,23,18,0.08)" },
  flotante: { boxShadow: "0px 8px 24px rgba(26,23,18,0.12)" },
} as const;

/** Familias de Inter por peso. En Android una fuente propia ignora `fontWeight`: hay que elegir la familia; `Texto` lo hace solo. */
export const fuentes = {
  regular: "Inter_400Regular",
  media: "Inter_500Medium",
  seminegrita: "Inter_600SemiBold",
  negrita: "Inter_700Bold",
} as const;

/** La familia de Inter que corresponde a un peso. 800 y 900 se dibujan en 700: la app no usa pesos más gruesos. */
export function familiaDelPeso(peso: string | number | undefined): string {
  const n = typeof peso === "number" ? peso : peso === "bold" ? 700 : peso === "normal" || peso == null ? 400 : Number(peso) || 400;
  if (n >= 700) return fuentes.negrita;
  if (n >= 600) return fuentes.seminegrita;
  if (n >= 500) return fuentes.media;
  return fuentes.regular;
}

/** Escala tipográfica. Ningún tamaño baja de 15 px (criterio de accesibilidad). Los grandes llevan interletrado negativo. */
export const tipografia = {
  cifra: { fontSize: 44, lineHeight: 50, fontWeight: "700" as const, letterSpacing: -1.4, fontVariant: ["tabular-nums" as const] },
  cifraMedia: { fontSize: 30, lineHeight: 36, fontWeight: "700" as const, letterSpacing: -0.8, fontVariant: ["tabular-nums" as const] },
  tituloGrande: { fontSize: 32, lineHeight: 38, fontWeight: "700" as const, letterSpacing: -0.9 },
  titulo: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const, letterSpacing: -0.5 },
  subtitulo: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const, letterSpacing: -0.25 },
  cuerpo: { fontSize: 16, lineHeight: 23, fontWeight: "400" as const, letterSpacing: -0.1 },
  secundario: { fontSize: TEXTO_MIN, lineHeight: 21, fontWeight: "400" as const, letterSpacing: -0.05 },
  /** Etiqueta corta en color de acento sobre un título (por ejemplo «Vas medio alto»). Sin mayúsculas sostenidas. */
  etiqueta: { fontSize: TEXTO_MIN, lineHeight: 20, fontWeight: "600" as const, letterSpacing: 0 },
};

export type VarianteTexto = keyof typeof tipografia;
