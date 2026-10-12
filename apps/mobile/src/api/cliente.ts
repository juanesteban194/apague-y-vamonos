import { API_URL } from "@/lib/config";

import { cerrarSesion, guardarTokens, renovarTokens, tokenAccesoVigente } from "./sesion";
import type {
  Agente,
  AgenteCreado,
  Consumo,
  Dispositivo,
  DispositivoCambios,
  DispositivoNuevo,
  Hogar,
  HogarCambios,
  HogarNuevo,
  Perfil,
  Periodo,
  Registro,
  Resumen,
  Tarifa,
  Tokens,
} from "./tipos";

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
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

/** El backend responde 403 "consentimiento_requerido" hasta que la persona acepta el tratamiento de datos. */
export const CONSENTIMIENTO_REQUERIDO = "consentimiento_requerido";

export async function iniciarSesion(email: string, contrasena: string): Promise<void> {
  const r = await enviar("/auth/login", "POST", { email: email.trim(), contrasena }, null);
  if (r.status === 401) throw new ErrorApi(401, "Correo o contraseña incorrectos");
  if (!r.ok) throw new ErrorApi(r.status, await detalle(r));
  await guardarTokens((await r.json()) as Tokens);
}

/** Crea la cuenta (con consentimiento) y entra. Los errores del servidor (correo repetido, clave corta) llegan con su mensaje. */
export async function registrarCuenta(datos: Registro): Promise<void> {
  const r = await enviar("/auth/registro", "POST", { ...datos, email: datos.email.trim() }, null);
  if (r.status === 409) throw new ErrorApi(409, "Ese correo ya tiene una cuenta. Entra o usa otro correo.");
  if (!r.ok) throw new ErrorApi(r.status, await detalle(r));
  await iniciarSesion(datos.email, datos.contrasena);
}

/** Paso final del inicio con Google: canjea el código de un solo uso con el verificador PKCE y guarda la sesión. */
export async function canjearGoogle(code: string, codeVerifier: string): Promise<void> {
  const r = await enviar("/auth/google/canje", "POST", { code, code_verifier: codeVerifier }, null);
  if (!r.ok) throw new ErrorApi(r.status, "No se pudo completar el inicio de sesión con Google. Intenta de nuevo.");
  await guardarTokens((await r.json()) as Tokens);
}

export { cerrarSesion };
export const obtenerPerfil = () => api<Perfil>("/auth/yo");
export const aceptarConsentimiento = () => api<Perfil>("/auth/consentimiento", "POST");
export const crearHogar = (datos: HogarNuevo) => api<Hogar>("/hogares", "POST", datos);
export const actualizarHogar = (hogarId: string, cambios: HogarCambios) => api<Hogar>(`/hogares/${hogarId}`, "PATCH", cambios);
export const listarDispositivos = (hogarId: string) => api<Dispositivo[]>(`/hogares/${hogarId}/dispositivos`);
export const crearDispositivo = (hogarId: string, datos: DispositivoNuevo) =>
  api<Dispositivo>(`/hogares/${hogarId}/dispositivos`, "POST", datos);
export const actualizarDispositivo = (hogarId: string, id: string, cambios: DispositivoCambios) =>
  api<Dispositivo>(`/hogares/${hogarId}/dispositivos/${id}`, "PATCH", cambios);
export const borrarDispositivo = (hogarId: string, id: string) => api<void>(`/hogares/${hogarId}/dispositivos/${id}`, "DELETE");
export const listarAgentes = (hogarId: string) => api<Agente[]>(`/hogares/${hogarId}/agentes`);
export const crearAgente = (hogarId: string, nombre: string) => api<AgenteCreado>(`/hogares/${hogarId}/agentes`, "POST", { nombre });
export const revocarAgente = (hogarId: string, id: string) => api<void>(`/hogares/${hogarId}/agentes/${id}`, "DELETE");
export const obtenerHogares = () => api<Hogar[]>("/hogares");
export const obtenerResumen = (hogarId: string) => api<Resumen>(`/hogares/${hogarId}/resumen`);
export const obtenerTarifa = (hogarId: string) => api<Tarifa>(`/hogares/${hogarId}/tarifa`);
export const obtenerConsumo = (dispositivoId: string, periodo: Periodo) =>
  api<Consumo>(`/dispositivos/${dispositivoId}/consumo?periodo=${periodo}`);
