/** Pesos colombianos: $1.234 (miles con punto). Bajo $100 se muestran centavos ($0,64) para no redondear a cero. */
export function formatoCOP(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  const abs = Math.abs(valor);
  const [entero, decimales] = abs.toFixed(abs < 100 ? 2 : 0).split(".");
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${valor < 0 ? "-" : ""}$${miles}${decimales ? "," + decimales : ""}`;
}

export function formatoPotencia(vatios: number): string {
  const texto = vatios < 10 ? vatios.toFixed(1).replace(".", ",") : Math.round(vatios).toString();
  return `${texto} W`;
}

export function formatoTarifa(copPorKwh: number): string {
  return `$${copPorKwh.toFixed(2).replace(".", ",")} por kWh`;
}
