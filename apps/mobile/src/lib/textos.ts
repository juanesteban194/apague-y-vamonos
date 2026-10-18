/** Texto de consentimiento (Ley 1581 de 2012). Provisional: el equipo debe revisarlo y enlazar su política de datos. */
export const TEXTO_CONSENTIMIENTO =
  "Autorizo el tratamiento de mis datos personales (nombre, correo y consumo de energía de mi casa), según la Ley 1581 de 2012, " +
  "para calcular mi consumo y su costo, enviarme avisos y darme recomendaciones de ahorro.";

export const OPCIONES_ESTRATO = [1, 2, 3, 4, 5, 6] as const;
export const OPCIONES_MEDIDOR = [
  { valor: "prepago", titulo: "Prepago" },
  { valor: "pospago", titulo: "Pospago" },
] as const;
