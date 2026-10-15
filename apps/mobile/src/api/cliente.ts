import { API_URL } from "@/lib/config";

import { cerrarSesion, guardarTokens, renovarTokens, tokenAccesoVigente } from "./sesion";
import type {
  Agente,
  Consejo,
  Historial,
  MesFactura,
  SimuladorDatos,
  SimuladorResultado,
  Alerta,
  LecturaMedidor,
  Prepago,
  Rutina,
  RutinaDatos,
  Sensibilidad,
  AgenteConCodigo,
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
export const crearAgenteConCodigo = (hogarId: string, nombre: string) => api<AgenteConCodigo>(`/hogares/${hogarId}/agentes/con-codigo`, "POST", { nombre });
export const codigoNuevoAgente = (hogarId: string, id: string) => api<AgenteConCodigo>(`/hogares/${hogarId}/agentes/${id}/codigo`, "POST");
export const renombrarAgente = (hogarId: string, id: string, nombre: string) => api<Agente>(`/hogares/${hogarId}/agentes/${id}`, "PATCH", { nombre });
export const revocarAgente = (hogarId: string, id: string) => api<void>(`/hogares/${hogarId}/agentes/${id}`, "DELETE");
export const obtenerHogares = () => api<Hogar[]>("/hogares");
export const obtenerResumen = (hogarId: string) => api<Resumen>(`/hogares/${hogarId}/resumen`);
export const obtenerTarifa = (hogarId: string) => api<Tarifa>(`/hogares/${hogarId}/tarifa`);
export const obtenerConsumo = (dispositivoId: string, periodo: Periodo) =>
  api<Consumo>(`/dispositivos/${dispositivoId}/consumo?periodo=${periodo}`);

export type ResultadoComando = { dispositivo_id: string; encendido: boolean; via: "agente" | "nube" };
export const encenderDispositivo = (id: string) => api<ResultadoComando>(`/dispositivos/${id}/encender`, "POST");
export const apagarDispositivo = (id: string) => api<ResultadoComando>(`/dispositivos/${id}/apagar`, "POST");

export const obtenerAlertas = (hogarId: string) => api<Alerta[]>(`/hogares/${hogarId}/alertas`);
export const marcarAlertaLeida = (hogarId: string, id: string) => api<void>(`/hogares/${hogarId}/alertas/${id}/leida`, "POST");
export const marcarAlertasLeidas = (hogarId: string) => api<void>(`/hogares/${hogarId}/alertas/leidas`, "POST");
export const obtenerPreferencias = (hogarId: string) => api<{ sensibilidad: Sensibilidad }>(`/hogares/${hogarId}/preferencias-alertas`);
export const guardarPreferencias = (hogarId: string, sensibilidad: Sensibilidad) =>
  api<{ sensibilidad: Sensibilidad }>(`/hogares/${hogarId}/preferencias-alertas`, "PUT", { sensibilidad });
export const obtenerPrepago = (hogarId: string) => api<Prepago>(`/hogares/${hogarId}/prepago`);
export const registrarSaldo = (hogarId: string, saldo: number) => api<Prepago>(`/hogares/${hogarId}/prepago`, "PUT", { saldo_cop: saldo });
export const listarRutinas = (hogarId: string) => api<Rutina[]>(`/hogares/${hogarId}/rutinas`);
export const crearRutina = (hogarId: string, datos: RutinaDatos) => api<Rutina>(`/hogares/${hogarId}/rutinas`, "POST", datos);
export const actualizarRutina = (hogarId: string, id: string, datos: RutinaDatos) => api<Rutina>(`/hogares/${hogarId}/rutinas/${id}`, "PUT", datos);
export const borrarRutina = (hogarId: string, id: string) => api<void>(`/hogares/${hogarId}/rutinas/${id}`, "DELETE");
export const listarLecturasMedidor = (hogarId: string) => api<LecturaMedidor[]>(`/hogares/${hogarId}/lecturas-medidor`);
export const borrarLecturaMedidor = (hogarId: string, id: string) => api<void>(`/hogares/${hogarId}/lecturas-medidor/${id}`, "DELETE");
export const borrarHogar = (hogarId: string) => api<void>(`/hogares/${hogarId}`, "DELETE");
export const registrarLecturaMedidor = (hogarId: string, lectura: number) =>
  api<LecturaMedidor>(`/hogares/${hogarId}/lecturas-medidor`, "POST", { lectura_kwh: lectura });
export const registrarTokenPush = (token: string, plataforma: "android" | "ios") => api<void>("/usuarios/yo/tokens-push", "PUT", { token, plataforma });
export const quitarTokenPush = (token: string, plataforma: "android" | "ios") => api<void>("/usuarios/yo/tokens-push", "DELETE", { token, plataforma });

export const obtenerConsejos = (hogarId: string) => api<Consejo[]>(`/hogares/${hogarId}/consejos`);
export const obtenerHistorial = (hogarId: string) => api<Historial>(`/hogares/${hogarId}/historial-consumo`);
export const guardarHistorial = (hogarId: string, meses: MesFactura[]) => api<Historial>(`/hogares/${hogarId}/historial-consumo`, "PUT", { meses });
export const simularRetiq = (datos: SimuladorDatos) => api<SimuladorResultado>("/simulador/retiq", "POST", datos);
