/** Pesos colombianos: $1.234 (miles con punto). Bajo $100 se muestran centavos ($0,64) para no redondear a cero. */
export function formatoCOP(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  const abs = Math.abs(valor);
  // Centavos solo cuando dicen algo (montos pequeños como $8,15); «$52,00» se escribe «$52».
  const [entero, decimales] = abs.toFixed(abs < 100 ? 2 : 0).replace(/\.00$/, "").split(".");
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${valor < 0 ? "-" : ""}$${miles}${decimales ? "," + decimales : ""}`;
}

export function formatoPotencia(vatios: number): string {
  const texto = vatios < 10 ? vatios.toFixed(1).replace(".", ",") : Math.round(vatios).toString();
  return `${texto} W`;
}

/** Miliamperios a amperios: 820 → "0,82 A"; 2.040 → "2,0 A". */
export function formatoAmperios(ma: number): string {
  const a = ma / 1000;
  return `${(a < 1 ? a.toFixed(2) : a.toFixed(1)).replace(".", ",")} A`;
}

export function formatoTarifa(copPorKwh: number): string {
  return `$${copPorKwh.toFixed(2).replace(".", ",")} por kWh`;
}

/** Interpreta lo que escribe la persona: "28500", "28.500" o "$28.500" → 28500; null si no hay ningún dígito. */
export function leerPesos(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, "");
  return limpio ? Number(limpio) : null;
}

/** 45238.5 → "45.238,5": miles con punto y decimales con coma, sin depender de Intl del teléfono. */
export function formatoNumero(valor: number): string {
  const [entero, decimales] = String(valor).split(".");
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (decimales ? "," + decimales : "");
}
