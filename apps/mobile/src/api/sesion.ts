import * as almacen from "@/lib/almacen";
import { create } from "zustand";

import { API_URL } from "@/lib/config";

import type { Tokens } from "./tipos";

const CLAVE_ACCESO = "token_acceso";
const CLAVE_RENOVACION = "token_renovacion";
const MARGEN_VENCIMIENTO_MS = 30_000;

type Estado = {
  cargada: boolean;
  accessToken: string | null;
  refreshToken: string | null;
};

export const useSesion = create<Estado>(() => ({ cargada: false, accessToken: null, refreshToken: null }));

export async function cargarSesion(): Promise<void> {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      almacen.leer(CLAVE_ACCESO),
      almacen.leer(CLAVE_RENOVACION),
    ]);
    useSesion.setState({ accessToken, refreshToken, cargada: true });
  } catch {
    useSesion.setState({ accessToken: null, refreshToken: null, cargada: true });
  }
}

export async function guardarTokens(t: Pick<Tokens, "access_token" | "refresh_token">): Promise<void> {
  useSesion.setState({ accessToken: t.access_token, refreshToken: t.refresh_token });
  await Promise.all([
    almacen.guardar(CLAVE_ACCESO, t.access_token),
    almacen.guardar(CLAVE_RENOVACION, t.refresh_token),
  ]);
}

export async function cerrarSesion(): Promise<void> {
  useSesion.setState({ accessToken: null, refreshToken: null });
  await Promise.all([almacen.borrar(CLAVE_ACCESO), almacen.borrar(CLAVE_RENOVACION)]);
}

function venceEn(token: string): number {
  try {
    const carga = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const relleno = carga + "=".repeat((4 - (carga.length % 4)) % 4);
    return JSON.parse(atob(relleno)).exp * 1000;
  } catch {
    return 0;
  }
}

let renovando: Promise<string | null> | null = null;

/** Pide tokens nuevos con el de renovación. Una sola petición a la vez aunque varias pantallas la pidan. */
export function renovarTokens(): Promise<string | null> {
  renovando ??= (async () => {
    const { refreshToken } = useSesion.getState();
    if (!refreshToken) return null;
    try {
      const r = await fetch(`${API_URL}/auth/renovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (r.status === 401) {
        await cerrarSesion(); // el de renovación venció: toca volver a entrar
        return null;
      }
      if (!r.ok) return null;
      const tokens = (await r.json()) as Tokens;
      await guardarTokens(tokens);
      return tokens.access_token;
    } catch {
      return null; // sin red: se conserva la sesión y se reintenta luego
    } finally {
      renovando = null;
    }
  })();
  return renovando;
}

/** Token de acceso válido; si vence en menos de 30 s lo renueva antes de usarlo. */
export async function tokenAccesoVigente(): Promise<string | null> {
  const { accessToken } = useSesion.getState();
  if (accessToken && venceEn(accessToken) - Date.now() > MARGEN_VENCIMIENTO_MS) return accessToken;
  return renovarTokens();
}
