import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { API_URL } from "@/lib/config";

import { canjearGoogle, ErrorApi } from "./cliente";

WebBrowser.maybeCompleteAuthSession();

function base64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function aleatorio(bytes: number): string {
  const datos = Crypto.getRandomBytes(bytes);
  let texto = "";
  for (const b of datos) texto += String.fromCharCode(b);
  return base64Url(btoa(texto));
}

/**
 * Inicio de sesión con Google (código de autorización con PKCE, manejado por nuestra API):
 * 1. se abre el navegador en /auth/google/inicio con el reto PKCE; 2. Google autentica y vuelve a la API;
 * 3. la API vuelve a la app con un código de un solo uso; 4. la app lo canjea con el verificador (que nunca salió del teléfono).
 * Devuelve false si la persona cerró el navegador sin terminar.
 */
export async function iniciarSesionConGoogle(): Promise<boolean> {
  const verificador = aleatorio(32);
  const reto = base64Url(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verificador, { encoding: Crypto.CryptoEncoding.BASE64 }));
  const state = aleatorio(16);
  const volverA = Linking.createURL("auth-google"); // apagueyvamonos://… en la app instalada, exp://… en Expo Go

  const url = `${API_URL}/auth/google/inicio?` + new URLSearchParams({ redirect_uri: volverA, code_challenge: reto, state }).toString();
  const resultado = await WebBrowser.openAuthSessionAsync(url, volverA);
  if (resultado.type !== "success") return false;

  const { queryParams } = Linking.parse(resultado.url);
  if (queryParams?.state !== state) throw new ErrorApi(0, "La respuesta de Google no es válida. Intenta de nuevo.");
  if (queryParams.error === "access_denied" || queryParams.error === "cancelado") return false;
  if (queryParams.error || typeof queryParams.code !== "string") {
    throw new ErrorApi(0, "No se pudo entrar con Google. Intenta de nuevo o usa tu correo.");
  }
  await canjearGoogle(queryParams.code, verificador);
  return true;
}
