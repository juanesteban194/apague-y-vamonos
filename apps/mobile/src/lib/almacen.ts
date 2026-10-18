import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** Dónde guarda la app sus datos pequeños (sesión, casa elegida, ayudas vistas).
 *  En el teléfono: expo-secure-store (cifrado por el sistema). En el navegador no existe ese almacén: se usa localStorage. La app no se
 *  publica para web; esto solo sirve para la vitrina de diseño (scripts/vitrina), que la abre en un navegador para tomar capturas. */
const web = Platform.OS === "web";

function local(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export async function leer(clave: string): Promise<string | null> {
  if (web) return local()?.getItem(clave) ?? null;
  return SecureStore.getItemAsync(clave);
}

export async function guardar(clave: string, valor: string): Promise<void> {
  if (web) return void local()?.setItem(clave, valor);
  await SecureStore.setItemAsync(clave, valor);
}

export async function borrar(clave: string): Promise<void> {
  if (web) return void local()?.removeItem(clave);
  await SecureStore.deleteItemAsync(clave);
}
