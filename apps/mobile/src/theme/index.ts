// Reglas de accesibilidad (CLAUDE.md): texto ≥ 15 px y áreas de toque ≥ 44 px.
export const AREA_TOQUE_MIN = 44;
export const TEXTO_MIN = 15;

export const colores = {
  fondo: "#F4F6F8",
  tarjeta: "#FFFFFF",
  borde: "#D5DAE0",
  texto: "#171A1F",
  textoSecundario: "#47505C",
  primario: "#0F5FD7",
  sobrePrimario: "#FFFFFF",
  // Semáforo (la lógica de qué color toca la calcula el backend: HU-04, Fase 5)
  verde: "#1B7A33",
  ambar: "#8F5B00",
  rojo: "#B3261E",
  apagado: "#5B6470",
} as const;

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;

export const tipografia = {
  cifra: { fontSize: 40, fontWeight: "700" as const },
  cifraMedia: { fontSize: 28, fontWeight: "700" as const },
  titulo: { fontSize: 22, fontWeight: "700" as const },
  subtitulo: { fontSize: 18, fontWeight: "600" as const },
  cuerpo: { fontSize: 17, fontWeight: "400" as const },
  secundario: { fontSize: TEXTO_MIN, fontWeight: "400" as const },
};
