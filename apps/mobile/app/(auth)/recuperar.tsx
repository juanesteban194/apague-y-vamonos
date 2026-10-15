import { router } from "expo-router";
import { useState } from "react";

import { ErrorApi, olvideContrasena, restablecerContrasena } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Recuperar la contraseña: 1) escribes tu correo y te llega un código de 6 números; 2) escribes el código y la contraseña nueva. */
export default function Recuperar() {
  const [paso, setPaso] = useState<"correo" | "codigo" | "listo">("correo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nueva, setNueva] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pedir() {
    setError(null);
    setCargando(true);
    try {
      await olvideContrasena(email.trim());
      setPaso("codigo");
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo enviar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function cambiar() {
    setError(null);
    setCargando(true);
    try {
      await restablecerContrasena(email.trim(), codigo.trim(), nueva);
      setPaso("listo");
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const codigoValido = /^\d{6}$/.test(codigo.trim());

  return (
    <PantallaFormulario>
      <Texto variante="titulo">Recuperar mi contraseña</Texto>

      {paso === "correo" && (
        <>
          <Texto color={colores.textoSecundario}>Escribe el correo de tu cuenta y te enviamos un código de 6 números.</Texto>
          <Campo etiqueta="Correo" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" value={email} onChangeText={setEmail} />
          {error && <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>{error}</Texto>}
          <Boton titulo="Enviarme el código" onPress={pedir} cargando={cargando} deshabilitado={!CORREO_VALIDO.test(email.trim())} />
        </>
      )}

      {paso === "codigo" && (
        <>
          <Tarjeta style={{ gap: espacio.s }}>
            <Texto style={{ fontWeight: "700" }}>Revisa tu correo</Texto>
            <Texto color={colores.textoSecundario}>
              Si {email.trim()} tiene una cuenta, te enviamos un código. Vale 15 minutos. Si no lo ves, mira en «spam» o «correo no deseado».
            </Texto>
          </Tarjeta>
          <Campo etiqueta="Código de 6 números" keyboardType="number-pad" maxLength={6} value={codigo} onChangeText={setCodigo} />
          <Campo
            etiqueta="Contraseña nueva"
            ayuda="Mínimo 8 caracteres."
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            value={nueva}
            onChangeText={setNueva}
          />
          {error && <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>{error}</Texto>}
          <Boton titulo="Cambiar mi contraseña" onPress={cambiar} cargando={cargando} deshabilitado={!codigoValido || nueva.length < 8} />
          <Boton titulo="Pedir otro código" variante="secundario" onPress={() => { setPaso("correo"); setCodigo(""); setError(null); }} deshabilitado={cargando} />
        </>
      )}

      {paso === "listo" && (
        <>
          <Tarjeta style={{ gap: espacio.s, backgroundColor: colores.verdeFondo, borderColor: colores.verdeSuave }}>
            <Texto variante="subtitulo">¡Listo! Cambiaste tu contraseña</Texto>
            <Texto>Por tu seguridad, cerramos las demás sesiones abiertas. Entra con tu contraseña nueva.</Texto>
          </Tarjeta>
          <Boton titulo="Ir a entrar" onPress={() => router.replace("/login")} />
        </>
      )}
    </PantallaFormulario>
  );
}
