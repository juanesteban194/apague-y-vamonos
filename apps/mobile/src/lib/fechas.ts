import type { Periodo } from "@/api/tipos";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** El backend manda fechas con offset de Bogotá ("2026-10-12T14:00:00-05:00"): se leen del texto, sin depender
 *  de la zona horaria del teléfono. */
export function etiquetaPunto(iso: string, periodo: Periodo): string {
  const anio = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  if (periodo === "dia") return String(Number(iso.slice(11, 13)));
  if (periodo === "semana") return DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return MESES_CORTOS[mes - 1]; // periodo «mes»: un punto por mes
}

/** El mes de un punto de la serie mensual: "octubre", o "diciembre de 2025" si no es del año de `referencia`. */
export function nombreMes(iso: string, referencia: string): string {
  const nombre = MESES[Number(iso.slice(5, 7)) - 1];
  return iso.slice(0, 4) === referencia.slice(0, 4) ? nombre : `${nombre} de ${iso.slice(0, 4)}`;
}

/** Qué momento es una barra, dicho completo: «De 14:00 a 15:00», «Lunes 19 de octubre» o «Septiembre» (con el año si no es el de `referencia`). */
export function detallePunto(iso: string, periodo: Periodo, referencia: string): string {
  const anio = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  if (periodo === "dia") {
    const h = Number(iso.slice(11, 13));
    return `De ${h}:00 a ${(h + 1) % 24}:00`;
  }
  if (periodo === "semana") {
    const nombre = DIAS_COMPLETOS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
    return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${dia} de ${MESES[mes - 1]}`;
  }
  const m = nombreMes(iso, referencia);
  return m[0].toUpperCase() + m.slice(1);
}

/** "2026-09-01" → "septiembre de 2026" */
export function mesDeTarifa(fecha: string): string {
  return `${MESES[Number(fecha.slice(5, 7)) - 1]} de ${fecha.slice(0, 4)}`;
}

/** "hace 5 min" para una fecha ISO; para lo muy reciente "ahora". */
export function haceCuanto(iso: string, ahora: number = Date.now()): string {
  const segundos = Math.max(0, Math.round((ahora - Date.parse(iso)) / 1000));
  if (segundos < 60) return "hace instantes";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 48) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} días`;
}

const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "jueves 10" para una fecha ISO (en la zona del teléfono; el día se ve igual que en la factura). */
export function diaYNumero(iso: string): string {
  const f = new Date(iso);
  return `${DIAS_LARGOS[f.getDay()]} ${f.getDate()}`;
}

const DIAS_COMPLETOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES_COMPLETOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "Martes, 13 de octubre" */
export function fechaLarga(fecha: Date): string {
  const dia = DIAS_COMPLETOS[fecha.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)}, ${fecha.getDate()} de ${MESES_COMPLETOS[fecha.getMonth()]}`;
}

/** Los `n` meses anteriores al actual, del más reciente al más antiguo: [{ mes: "2026-09-01", nombre: "septiembre de 2026" }, …] */
export function mesesAnteriores(n: number, hoy: Date = new Date()): { mes: string; nombre: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - 1 - i, 1);
    const mes = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-01`;
    return { mes, nombre: `${MESES_COMPLETOS[f.getMonth()]} de ${f.getFullYear()}` };
  });
}
