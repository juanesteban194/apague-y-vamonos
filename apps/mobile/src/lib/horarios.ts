export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const; // 0 = lunes, como en la API

/** [0,1,2,3,4] → "Lun a Vie"; [0..6] → "Todos los días"; [0,2,4] → "Lun, Mié, Vie". */
export function textoDias(dias: number[]): string {
  const d = [...dias].sort((a, b) => a - b);
  if (d.length === 7) return "Todos los días";
  const seguidos = d.length > 2 && d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  if (seguidos) return `${DIAS_CORTOS[d[0]]} a ${DIAS_CORTOS[d[d.length - 1]]}`;
  return d.map((v) => DIAS_CORTOS[v]).join(", ");
}

/** "22:00" o "6:30" → "22:00:00" / "06:30:00" (lo que espera la API); null si no es una hora válida de 24 h. */
export function leerHora(texto: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}:00`;
}

/** "22:00:00" → "22:00" */
export const mostrarHora = (hora: string): string => hora.slice(0, 5);
