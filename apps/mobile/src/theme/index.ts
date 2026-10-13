// Reglas de accesibilidad (CLAUDE.md): texto ≥ 15 px y áreas de toque ≥ 44 px.
export const AREA_TOQUE_MIN = 44;
export const TEXTO_MIN = 15;

/** Paleta del mockup "Ahorra" (diseño original): neutros cálidos, tinta oscura para acciones y el semáforo como único color vivo.
 *  Contrastes sobre blanco: texto 17:1, secundario 5:1, y los textos de color usan las variantes oscuras (verde, ámbar). */
export const colores = {
  fondo: "#F4F1EA",
  tarjeta: "#FFFFFF",
  borde: "#DDDAD2",
  texto: "#1B1A17",
  textoSecundario: "#6E6A62",
  // Acciones: tinta oscura, como las pestañas y los selectores del mockup
  primario: "#1B1A17",
  sobrePrimario: "#F7F5F0",
  // Semáforo (la lógica de qué color toca la calcula el backend: HU-04, Fase 5). Los de texto son las variantes oscuras.
  verde: "#0F6B3C",
  ambar: "#8A6A18",
  rojo: "#C6402C",
  semaforoVerde: "#158A4E",
  semaforoAmbar: "#F0B429",
  semaforoRojo: "#C6402C",
  verdeSuave: "#9FCFB1",
  verdeFondo: "#E7F4EC",
  ambarFondo: "#FDF1D7",
  rojoFondo: "#FBE7E3",
  apagado: "#6E6A62",
  interruptorApagado: "#C2BDB2",
} as const;

/** Etiqueta RETIQ A–G (colores del mockup). */
export const coloresRetiq = { A: "#158A4E", B: "#4FA05C", C: "#8FB03F", D: "#E0B015", E: "#E08A16", F: "#D3612A", G: "#C6402C" } as const;

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;

export const tipografia = {
  cifra: { fontSize: 40, fontWeight: "700" as const },
  cifraMedia: { fontSize: 28, fontWeight: "700" as const },
  titulo: { fontSize: 22, fontWeight: "700" as const },
  subtitulo: { fontSize: 18, fontWeight: "600" as const },
  cuerpo: { fontSize: 17, fontWeight: "400" as const },
  secundario: { fontSize: TEXTO_MIN, fontWeight: "400" as const },
};
