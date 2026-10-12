import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { ErrorApi, iniciarSesion } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { BotonGoogle } from "@/components/BotonGoogle";
import { Campo } from "@/components/Campo";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

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
      await iniciarSesion(email, contrasena); // al guardar la sesión, la navegación cambia sola
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo entrar. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario>
      <View style={{ gap: espacio.s }}>
        <Texto variante="titulo">Apague y vámonos</Texto>
        <Texto color={colores.textoSecundario}>Mira cuánto gasta cada aparato de tu casa, en pesos.</Texto>
      </View>

      <BotonGoogle />
      <Texto variante="secundario" color={colores.textoSecundario} style={{ textAlign: "center" }}>
        o con tu correo
      </Texto>

      <View style={{ gap: espacio.m }}>
        <Campo
          etiqueta="Correo"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <Campo
          etiqueta="Contraseña"
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          value={contrasena}
          onChangeText={setContrasena}
          onSubmitEditing={entrar}
        />
      </View>
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      {tardando && <Texto variante="secundario" color={colores.textoSecundario}>Despertando el servidor, puede tardar hasta un minuto…</Texto>}
      <Boton titulo="Entrar" onPress={entrar} cargando={cargando} deshabilitado={!email || !contrasena} />

      <Link href="/registro" accessibilityRole="link" style={{ minHeight: AREA_TOQUE_MIN, textAlign: "center", paddingVertical: 12, fontSize: 17, fontWeight: "600", color: colores.primario }}>
        ¿No tienes cuenta? Crear cuenta
      </Link>
    </PantallaFormulario>
  );
}
