import { API_URL } from "@/lib/config";

import { cerrarSesion, guardarTokens, renovarTokens, tokenAccesoVigente } from "./sesion";
import type { Consumo, Hogar, Periodo, Resumen, Tarifa, Tokens } from "./tipos";

// Render gratuito tarda hasta ~1 min en despertar tras 15 min sin tráfico.
const TIEMPO_MAXIMO_MS = 60_000;

export class ErrorApi extends Error {
  constructor(
    public estado: number, // 0 = sin conexión
    mensaje: string,
  ) {
    super(mensaje);
  }
}

async function detalle(r: Response): Promise<string> {
  try {
    const cuerpo = await r.json();
    if (typeof cuerpo.detail === "string") return cuerpo.detail;
  } catch {
    // sin cuerpo JSON
  }
  return `Error ${r.status}`;
}

async function enviar(ruta: string, metodo: string, cuerpo: unknown, token: string | null): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);
  try {
    return await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: controlador.signal,
    });
  } catch {
    throw new ErrorApi(0, "No hay conexión con el servidor");
  } finally {
    clearTimeout(temporizador);
  }
}

async function api<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  let respuesta = await enviar(ruta, metodo, cuerpo, await tokenAccesoVigente());
  if (respuesta.status === 401) {
    const nuevo = await renovarTokens();
    if (!nuevo) throw new ErrorApi(401, "Tu sesión venció. Vuelve a entrar.");
    respuesta = await enviar(ruta, metodo, cuerpo, nuevo);
  }
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, await detalle(respuesta));
  return (await respuesta.json()) as T;
}

export async function iniciarSesion(email: string, contrasena: string): Promise<void> {
  const r = await enviar("/auth/login", "POST", { email: email.trim(), contrasena }, null);
  if (r.status === 401) throw new ErrorApi(401, "Correo o contraseña incorrectos");
  if (!r.ok) throw new ErrorApi(r.status, await detalle(r));
  await guardarTokens((await r.json()) as Tokens);
}

export { cerrarSesion };
export const obtenerHogares = () => api<Hogar[]>("/hogares");
export const obtenerResumen = (hogarId: string) => api<Resumen>(`/hogares/${hogarId}/resumen`);
export const obtenerTarifa = (hogarId: string) => api<Tarifa>(`/hogares/${hogarId}/tarifa`);
export const obtenerConsumo = (dispositivoId: string, periodo: Periodo) =>
  api<Consumo>(`/dispositivos/${dispositivoId}/consumo?periodo=${periodo}`);
