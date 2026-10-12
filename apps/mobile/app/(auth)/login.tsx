import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorApi, iniciarSesion } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { Texto } from "@/components/Texto";
import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

const estiloCampo = {
  minHeight: AREA_TOQUE_MIN + 8,
  borderWidth: 2,
  borderColor: colores.borde,
  borderRadius: 12,
  paddingHorizontal: 14,
  fontSize: 17,
  color: colores.texto,
  backgroundColor: colores.tarjeta,
} as const;

export default function Login() {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tardando, setTardando] = useState(false);

  // El servidor gratuito puede estar dormido: se avisa en vez de dejar la pantalla sin explicación.
  useEffect(() => {
    if (!cargando) return setTardando(false);
    const t = setTimeout(() => setTardando(true), 5000);
    return () => clearTimeout(t);
  }, [cargando]);

  async function entrar() {
    setError(null);
    setCargando(true);
    try {
      await iniciarSesion(email, contrasena); // al guardar la sesión, el layout cambia de pantalla solo
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo entrar. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", padding: espacio.xl, gap: espacio.l }}>
        <View style={{ gap: espacio.s }}>
          <Texto variante="titulo">Apague y vámonos</Texto>
          <Texto color={colores.textoSecundario}>Entra para ver cuánto gasta cada aparato de tu casa.</Texto>
        </View>
        <View style={{ gap: espacio.m }}>
          <TextInput
            accessibilityLabel="Correo"
            placeholder="Correo"
            placeholderTextColor={colores.textoSecundario}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            style={estiloCampo}
          />
          <TextInput
            accessibilityLabel="Contraseña"
            placeholder="Contraseña"
            placeholderTextColor={colores.textoSecundario}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={contrasena}
            onChangeText={setContrasena}
            onSubmitEditing={entrar}
            style={estiloCampo}
          />
        </View>
        {error && (
          <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
            {error}
          </Texto>
        )}
        {tardando && <Texto variante="secundario" color={colores.textoSecundario}>Despertando el servidor, puede tardar hasta un minuto…</Texto>}
        <Boton titulo="Entrar" onPress={entrar} cargando={cargando} deshabilitado={!email || !contrasena} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
