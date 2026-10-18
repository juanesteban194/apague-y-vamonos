import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export type ModuloNotificaciones = typeof import("expo-notifications");

type Entorno = { plataforma: string; ejecucion: string | undefined };

/** Expo Go en Android no admite las notificaciones: desde el SDK 53, con solo IMPORTAR `expo-notifications` lanza un error que tumba toda la app
 *  (se ve «Cannot read property 'ErrorBoundary' of undefined»). Por eso nadie debe importarla de forma directa: se pide aquí, y en ese entorno
 *  (o si falla al cargar) devuelve null y la app sigue con los avisos dentro de ella, sin notificaciones del sistema. */
export function cargarNotificaciones(entorno: Entorno, requerir: () => ModuloNotificaciones): ModuloNotificaciones | null {
  if (entorno.plataforma === "android" && entorno.ejecucion === ExecutionEnvironment.StoreClient) return null; // Expo Go en Android
  if (entorno.plataforma === "web") return null; // la vitrina de diseño en el navegador: sin notificaciones del sistema
  try {
    return requerir();
  } catch {
    return null;
  }
}

let cargado: ModuloNotificaciones | null | undefined;

/** El módulo de notificaciones, o null donde no se puede usar. Se carga una sola vez, la primera vez que se pide. */
export function notificaciones(): ModuloNotificaciones | null {
  cargado ??= cargarNotificaciones({ plataforma: Platform.OS, ejecucion: Constants.executionEnvironment }, () => require("expo-notifications") as ModuloNotificaciones);
  return cargado;
}
