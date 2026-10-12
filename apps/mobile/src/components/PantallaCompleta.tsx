import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colores, espacio } from "@/theme";

/** Pantalla de formulario: sube con el teclado y se desplaza. */
export function PantallaFormulario({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: espacio.xl, gap: espacio.l, flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
