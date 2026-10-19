import { Alert, Platform } from "react-native";

/** Pregunta antes de algo que no se deshace. En el teléfono es el diálogo del sistema (con el botón en rojo); en la web, `confirm`. */
export function confirmar(titulo: string, mensaje: string, accion: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(typeof window !== "undefined" && window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: "Cancelar", style: "cancel", onPress: () => resolver(false) },
      { text: accion, style: "destructive", onPress: () => resolver(true) },
    ], { cancelable: true, onDismiss: () => resolver(false) }),
  );
}
