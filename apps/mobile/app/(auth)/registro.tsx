import { Link } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ErrorApi, registrarCuenta } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { BotonGoogle } from "@/components/BotonGoogle";
import { Campo } from "@/components/Campo";
import { Casilla } from "@/components/Casilla";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { TEXTO_CONSENTIMIENTO } from "@/lib/textos";
import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problemas = [
    !nombre.trim() && "Escribe tu nombre.",
    !CORREO.test(email.trim()) && "Escribe un correo válido.",
    contrasena.length < 8 && "La contraseña debe tener al menos 8 caracteres.",
    !acepta && "Debes aceptar el tratamiento de datos para crear la cuenta.",
  ].filter(Boolean) as string[];

  async function crear() {
    setError(null);
    setCargando(true);
    try {
      await registrarCuenta({ nombre: nombre.trim(), email, contrasena, acepta_tratamiento_datos: acepta });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo crear la cuenta. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario>
      <Texto variante="titulo">Crear cuenta</Texto>

      <View style={{ gap: espacio.m }}>
        <Campo etiqueta="Nombre" autoComplete="name" textContentType="name" value={nombre} onChangeText={setNombre} />
        <Campo etiqueta="Correo" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" value={email} onChangeText={setEmail} />
        <Campo
          etiqueta="Contraseña"
          ayuda="Mínimo 8 caracteres."
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          value={contrasena}
          onChangeText={setContrasena}
        />
      </View>

      <Casilla marcada={acepta} alCambiar={setAcepta} texto={TEXTO_CONSENTIMIENTO} />

      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      {problemas.length > 0 && (nombre || email || contrasena) && (
        <Texto variante="secundario" color={colores.textoSecundario}>
          {problemas[0]}
        </Texto>
      )}
      <Boton titulo="Crear cuenta" onPress={crear} cargando={cargando} deshabilitado={problemas.length > 0} />

      <Texto variante="secundario" color={colores.textoSecundario} style={{ textAlign: "center" }}>
        o
      </Texto>
      <BotonGoogle titulo="Registrarme con Google" />

      <Link href="/login" accessibilityRole="link" style={{ minHeight: AREA_TOQUE_MIN, textAlign: "center", paddingVertical: 12, fontSize: 17, fontWeight: "600", color: colores.primario }}>
        ¿Ya tienes cuenta? Entrar
      </Link>
    </PantallaFormulario>
  );
}
