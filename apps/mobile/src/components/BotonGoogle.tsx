import { useState } from "react";
import { View } from "react-native";

import { ErrorApi } from "@/api/cliente";
import { iniciarSesionConGoogle } from "@/api/google";
import { espacio, colores } from "@/theme";

import { Boton } from "./Boton";
import { LogoGoogle } from "./Icono";
import { Texto } from "./Texto";

type Props = { titulo?: string };

/** Entra o crea la cuenta con Google. Al terminar, el cambio de sesión lleva solo a la pantalla que toca. */
export function BotonGoogle({ titulo = "Continuar con Google" }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setError(null);
    setCargando(true);
    try {
      await iniciarSesionConGoogle();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo entrar con Google. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={{ gap: espacio.s }}>
      <Boton titulo={titulo} variante="secundario" onPress={entrar} cargando={cargando} icono={<LogoGoogle />} />
      {error && (
        <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
    </View>
  );
}
