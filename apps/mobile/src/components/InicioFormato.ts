/** Formato de presentación de Inicio. No calcula costos: solo decide cómo se escribe lo que ya mandó el backend. */
import { formatoCOP, formatoNumero, formatoPotencia } from "@/lib/formato";

/** Como `formatoCOP`, pero un cero exacto se escribe «$0» (y no «$0,00»): se lee más limpio en un día sin consumo. */
export function pesos(valor: number | null | undefined): string {
  return valor === 0 ? "$0" : formatoCOP(valor);
}

/** «1.180 W» con punto de miles; bajo 10 W conserva el decimal («7,4 W»). */
export function vatios(w: number): string {
  return w < 10 ? formatoPotencia(w) : `${formatoNumero(Math.round(w))} W`;
}
