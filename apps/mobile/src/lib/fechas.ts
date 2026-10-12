import type { Periodo } from "@/api/tipos";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** El backend manda fechas con offset de Bogotá ("2026-10-12T14:00:00-05:00"): se leen del texto, sin depender
 *  de la zona horaria del teléfono. */
export function etiquetaPunto(iso: string, periodo: Periodo): string {
  const anio = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  if (periodo === "dia") return String(Number(iso.slice(11, 13)));
  if (periodo === "semana") return DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return String(dia);
}

/** "2026-09-01" → "septiembre de 2026" */
export function mesDeTarifa(fecha: string): string {
  return `${MESES[Number(fecha.slice(5, 7)) - 1]} de ${fecha.slice(0, 4)}`;
}
