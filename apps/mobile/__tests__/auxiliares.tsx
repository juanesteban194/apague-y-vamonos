import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { guardarTokens } from "@/api/sesion";

export function clienteDePrueba() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

export function renderizar(ui: ReactElement, cliente = clienteDePrueba()) {
  return render(<QueryClientProvider client={cliente}>{ui}</QueryClientProvider>);
}

/** JWT falso con vencimiento lejano (la app solo lee `exp`). */
export function jwtFalso(venceEnSegundos = 3600): string {
  const carga = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + venceEnSegundos }));
  return `cabecera.${carga}.firma`;
}

export async function iniciarSesionDePrueba() {
  await guardarTokens({ access_token: jwtFalso(), refresh_token: jwtFalso(86400) });
}

export class WebSocketFalso {
  static OPEN = 1;
  static instancias: WebSocketFalso[] = [];
  readyState = 1;
  enviados: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((m: { data: string }) => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    WebSocketFalso.instancias.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }
  send(dato: string) {
    this.enviados.push(dato);
  }
  close() {
    this.onclose?.({ code: 1000 });
  }
  emitir(evento: object) {
    this.onmessage?.({ data: JSON.stringify(evento) });
  }
}

export function respuestaJson(cuerpo: unknown, estado = 200) {
  return { ok: estado >= 200 && estado < 300, status: estado, json: async () => cuerpo } as Response;
}

export const HOGAR = { id: "h1", nombre: "Casa demo", barrio: null, estrato: 3, tipo_medidor: null, limite_subsistencia_kwh: 130, rol: "titular" };
export const TARIFA = {
  estrato: 3, mes: "2026-09-01", cop_kwh_subsistencia: 814.63, cop_kwh_sobre_subsistencia: 958.38, fuente: "EPM", es_del_mes_actual: false,
};
export const RESUMEN = {
  hogar_id: "h1",
  calculado_en: "2026-10-12T15:00:00Z",
  tarifa: TARIFA,
  kwh_hoy: 0.01,
  kwh_mes: 0.01,
  subsistencia: { limite_kwh: 130, consumo_kwh: 80, porcentaje: 80 / 130, fuente: "enchufes", nivel: "verde" },
  costo_hoy_cop: 8.15,
  costo_mes_cop: 8.15,
  dispositivos: [
    {
      id: "d1", nombre: "Enchufe BSD04", encendido: true, potencia_w: 26.5, ultima_lectura: "2026-10-12T14:59:58Z", en_linea: true,
      kwh_hoy: 0.01, kwh_mes: 0.01, costo_hoy_cop: 8.15, costo_mes_cop: 8.15,
    },
  ],
};
export const CONSUMO_DIA = {
  dispositivo_id: "d1",
  periodo: "dia",
  desde: "2026-10-12T00:00:00-05:00",
  hasta: "2026-10-13T00:00:00-05:00",
  tarifa_mes: "2026-09-01",
  kwh_total: 0.01,
  costo_total_cop: 8.15,
  serie: Array.from({ length: 24 }, (_, h) => ({
    inicio: `2026-10-12T${String(h).padStart(2, "0")}:00:00-05:00`,
    kwh: h === 10 ? 0.01 : 0,
    costo_cop: h === 10 ? 8.15 : 0,
  })),
};
