import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registrarTokenPush } from "@/api/cliente";
import type { EventoAlerta } from "@/realtime/eventos";
import { useTiempoReal } from "@/realtime/estado";

// Deben coincidir con lo que manda el backend (integrations/expo_push/cliente.py).
export const CANAL_AVISOS = "avisos";
export const CATEGORIA_APAGAR = "aviso_con_apagar";
export const ACCION_APAGAR = "apagar";

/** Configura cómo se muestran las notificaciones y crea el canal y el botón "Apagar". Seguro de llamar varias veces. */
export async function prepararNotificaciones(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL_AVISOS, { name: "Avisos de consumo", importance: Notifications.AndroidImportance.HIGH });
  }
  await Notifications.setNotificationCategoryAsync(CATEGORIA_APAGAR, [
    { identifier: ACCION_APAGAR, buttonTitle: "Apagar", options: { opensAppToForeground: true } },
  ]);
}

export async function tienePermiso(pedir = false): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!pedir || !actual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Push remoto (Expo Push → FCM): solo funciona en una compilación propia con proyecto de EAS configurado. En Expo Go
 * (Android) o en un iPhone con cuenta gratuita no se puede: se sigue con notificaciones locales mientras la app está abierta.
 * Devuelve true si el celular quedó registrado en la API.
 */
export async function registrarPush(): Promise<boolean> {
  try {
    const proyecto = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!proyecto || !(await tienePermiso(true))) return false;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: proyecto });
    await registrarTokenPush(token, Platform.OS === "ios" ? "ios" : "android");
    useTiempoReal.setState({ pushActivo: true });
    return true;
  } catch {
    return false; // sin push: no es un error, solo se queda con los avisos dentro de la app
  }
}

/** Notificación local por un aviso que llegó con la app abierta (si hay push remoto activo, ya la mostró el sistema). */
export async function mostrarAvisoLocal(evento: EventoAlerta): Promise<void> {
  if (useTiempoReal.getState().pushActivo || !(await tienePermiso(false))) return;
  await Notifications.scheduleNotificationAsync({
    identifier: evento.id,
    content: {
      title: evento.titulo,
      body: evento.mensaje,
      sound: true,
      data: { alerta_id: evento.id, dispositivo_id: evento.dispositivo_id, nivel: evento.nivel, tipo: evento.alerta_tipo },
      categoryIdentifier: evento.dispositivo_id && evento.alerta_tipo === "alto_riesgo" ? CATEGORIA_APAGAR : undefined,
    },
    trigger: null,
  });
}
