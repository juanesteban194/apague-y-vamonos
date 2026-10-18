import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ErrorApi, olvideContrasena, restablecerContrasena } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { CuentaAviso, CuentaCampoCodigo, CuentaCampoContrasena, CuentaEncabezado, CuentaRequisito } from "@/components/CuentaPiezas";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { exito } from "@/lib/haptica";
import { espacio } from "@/theme";

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
      exito();
      setPaso("listo");
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const codigoValido = /^\d{6}$/.test(codigo.trim());

  return (
    <PantallaFormulario centrado={false}>
      {paso === "correo" && (
        <>
          <CuentaEncabezado
            icono="llave"
            etiqueta="Paso 1 de 2"
            titulo="Te ayudamos a entrar"
            subtitulo="Escribe el correo de tu cuenta y te enviamos un código de 6 números."
          />
          <Campo
            etiqueta="Correo"
            placeholder="tucorreo@ejemplo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => CORREO_VALIDO.test(email.trim()) && void pedir()}
          />
          {error && <CuentaAviso texto={error} />}
          <Boton titulo="Enviarme el código" onPress={pedir} cargando={cargando} deshabilitado={!CORREO_VALIDO.test(email.trim())} />
        </>
      )}

      {paso === "codigo" && (
        <>
          <CuentaEncabezado
            icono="correo"
            etiqueta="Paso 2 de 2"
            titulo="Revisa tu correo"
            subtitulo={`Si ${email.trim()} tiene una cuenta, te enviamos un código. Vale 15 minutos. Si no lo ves, mira en «spam» o «correo no deseado».`}
          />
          <CuentaCampoCodigo value={codigo} onChangeText={setCodigo} />
          <View style={{ gap: espacio.s }}>
            <CuentaCampoContrasena etiqueta="Contraseña nueva" autoComplete="new-password" textContentType="newPassword" value={nueva} onChangeText={setNueva} />
            <CuentaRequisito texto="Mínimo 8 caracteres" cumplido={nueva.length >= 8} />
          </View>
          {error && <CuentaAviso texto={error} />}
          <Boton titulo="Cambiar mi contraseña" onPress={cambiar} cargando={cargando} deshabilitado={!codigoValido || nueva.length < 8} />
          <Boton
            titulo="Pedir otro código"
            variante="texto"
            onPress={() => {
              setPaso("correo");
              setCodigo("");
              setError(null);
            }}
            deshabilitado={cargando}
          />
        </>
      )}

      {paso === "listo" && (
        <>
          <CuentaEncabezado
            icono="ok"
            tono="verde"
            titulo="¡Listo! Cambiaste tu contraseña"
            subtitulo="Por tu seguridad, cerramos las demás sesiones abiertas. Entra con tu contraseña nueva."
          />
          <Boton titulo="Ir a entrar" onPress={() => router.replace("/login")} />
        </>
      )}
    </PantallaFormulario>
  );
}
