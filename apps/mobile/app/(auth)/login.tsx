import { useEffect, useState } from "react";
import { View } from "react-native";

import { ErrorApi, iniciarSesion } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { BotonGoogle } from "@/components/BotonGoogle";
import { Campo } from "@/components/Campo";
import { CuentaAviso, CuentaCampoContrasena, CuentaEnlace, CuentaSeparador } from "@/components/CuentaPiezas";
import { MarcaEncabezado } from "@/components/MarcaApague";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { espacio } from "@/theme";

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
      <MarcaEncabezado lema="Lo que gasta cada dispositivo, en pesos. Para que pagues menos que tu promedio." />

      <View style={{ gap: espacio.l, marginTop: espacio.l }}>
        <BotonGoogle />
        <CuentaSeparador texto="o con tu correo" />

        <View style={{ gap: espacio.l }}>
          <Campo
            etiqueta="Correo"
            placeholder="tucorreo@ejemplo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <View>
            <CuentaCampoContrasena
              etiqueta="Contraseña"
              autoComplete="password"
              textContentType="password"
              value={contrasena}
              onChangeText={setContrasena}
              onSubmitEditing={entrar}
            />
            <CuentaEnlace href="/recuperar" texto="¿Olvidaste tu contraseña?" alinear="flex-end" discreto />
          </View>
        </View>

        {error && <CuentaAviso texto={error} />}
        {tardando && <CuentaAviso tono="info" texto="Estamos despertando el servidor. Puede tardar hasta un minuto." />}
        <Boton titulo="Entrar" onPress={entrar} cargando={cargando} deshabilitado={!email || !contrasena} />
      </View>

      <View style={{ marginTop: espacio.s }}>
        <CuentaEnlace href="/registro" pregunta="¿No tienes cuenta?" texto="Crear cuenta" />
      </View>
    </PantallaFormulario>
  );
}
