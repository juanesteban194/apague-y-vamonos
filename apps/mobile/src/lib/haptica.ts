import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/** Vibraciones cortas que confirman una acción (como en las apps de Apple). Nunca fallan: si el teléfono no vibra, no pasa nada. */
const disponible = Platform.OS === "ios" || Platform.OS === "android";

export function tocar(): void {
  if (disponible) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function seleccionar(): void {
  if (disponible) void Haptics.selectionAsync().catch(() => {});
}

export function exito(): void {
  if (disponible) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function aviso(): void {
  if (disponible) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
