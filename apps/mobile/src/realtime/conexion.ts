import { renovarTokens, tokenAccesoVigente } from "@/api/sesion";
import { WS_URL } from "@/lib/config";

import type { EstadoConexion, EventoEnVivo } from "./eventos";

const CIERRE_NO_AUTENTICADO = 4401;
const CIERRE_SIN_ACCESO = 4403;
const ESPERA_MAXIMA_MS = 30_000;
const PING_CADA_MS = 25_000;

/** Conexión al hogar con reconexión de espera creciente (1 s, 2 s, 4 s … 30 s, con algo de azar). */
export class ConexionHogar {
  private ws: WebSocket | null = null;
  private intento = 0;
  private detenida = true;
  private reconexion: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;

  constructor(
    private hogarId: string,
    private alEvento: (evento: EventoEnVivo) => void,
    private alEstado: (estado: EstadoConexion) => void,
  ) {}

  iniciar(): void {
    if (!this.detenida) return;
    this.detenida = false;
    void this.abrir();
  }

  detener(): void {
    this.detenida = true;
    if (this.reconexion) clearTimeout(this.reconexion);
    this.limpiarPing();
    this.ws?.close();
    this.ws = null;
  }

  private async abrir(): Promise<void> {
    this.alEstado(this.intento === 0 ? "conectando" : "reconectando");
    const token = await tokenAccesoVigente();
    if (this.detenida) return;
    if (!token) return this.programarReconexion(); // sin red o sin sesión: se reintenta

    const ws = new WebSocket(`${WS_URL}/ws/hogares/${this.hogarId}`);
    this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ token })); // el token va en el primer mensaje, no en la URL
    ws.onmessage = (m) => {
      const evento = JSON.parse(String(m.data));
      if (evento.tipo === "conectado") {
        this.intento = 0;
        this.alEstado("conectado");
        this.iniciarPing(ws);
      } else if (evento.tipo !== "pong") {
        this.alEvento(evento as EventoEnVivo);
      }
    };
    ws.onclose = (e) => {
      this.limpiarPing();
      if (this.detenida || this.ws !== ws) return;
      if (e.code === CIERRE_SIN_ACCESO) return this.alEstado("sin_acceso");
      if (e.code === CIERRE_NO_AUTENTICADO) void renovarTokens();
      this.programarReconexion();
    };
    ws.onerror = () => {}; // siempre va seguido de onclose
  }

  private programarReconexion(): void {
    this.alEstado("reconectando");
    const base = Math.min(ESPERA_MAXIMA_MS, 1000 * 2 ** this.intento);
    this.intento += 1;
    this.reconexion = setTimeout(() => void this.abrir(), base * (0.5 + Math.random() / 2));
  }

  private iniciarPing(ws: WebSocket): void {
    this.limpiarPing();
    this.ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send("ping"), PING_CADA_MS);
  }

  private limpiarPing(): void {
    if (this.ping) clearInterval(this.ping);
    this.ping = null;
  }
}
