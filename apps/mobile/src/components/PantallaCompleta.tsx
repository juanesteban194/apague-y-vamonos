import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colores, espacio } from "@/theme";

/** Pantalla de formulario: sube con el teclado y se desplaza. Columna centrada y con aire, como un formulario de Apple.
 *  Con `conCabecera` no reserva el margen de arriba del sistema (ya lo ocupa la cabecera de la navegación). */
export function PantallaFormulario({ children, centrado = true, conCabecera = false }: { children: ReactNode; centrado?: boolean; conCabecera?: boolean }) {
  return (
    <SafeAreaView edges={conCabecera ? ["left", "right", "bottom"] : undefined} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: espacio.xl, paddingVertical: espacio.xl, gap: espacio.l, flexGrow: 1, justifyContent: centrado ? "center" : "flex-start", width: "100%", maxWidth: 560, alignSelf: "center" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
