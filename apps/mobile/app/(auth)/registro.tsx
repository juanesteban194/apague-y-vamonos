import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ErrorApi, registrarCuenta } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { BotonGoogle } from "@/components/BotonGoogle";
import { Campo } from "@/components/Campo";
import { Casilla } from "@/components/Casilla";
import { CuentaAviso, CuentaCampoContrasena, CuentaEncabezado, CuentaEnlace, CuentaRequisito, CuentaSeparador } from "@/components/CuentaPiezas";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { FilaLista, Separador } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { TEXTO_CONSENTIMIENTO } from "@/lib/textos";
import { espacio } from "@/theme";

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
  const empezo = Boolean(nombre || email || contrasena); // la pista sale solo cuando ya empezaste a llenar

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
      <CuentaEncabezado marca titulo="Crea tu cuenta" subtitulo="Así ves desde cualquier celular cuánto gasta tu casa." />

      <BotonGoogle titulo="Registrarme con Google" />
      <CuentaSeparador texto="o con tu correo" />

      <View style={{ gap: espacio.l }}>
        <Campo etiqueta="Nombre" placeholder="Ana Restrepo" autoComplete="name" textContentType="name" value={nombre} onChangeText={setNombre} />
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
        <View style={{ gap: espacio.s }}>
          <CuentaCampoContrasena etiqueta="Contraseña" autoComplete="new-password" textContentType="newPassword" value={contrasena} onChangeText={setContrasena} />
          <CuentaRequisito texto="Mínimo 8 caracteres" cumplido={contrasena.length >= 8} />
        </View>
      </View>

      <Tarjeta style={{ padding: 0, gap: 0 }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Casilla marcada={acepta} alCambiar={setAcepta} texto={TEXTO_CONSENTIMIENTO} />
        </View>
        <Separador sangria={16} />
        <FilaLista
          icono="escudo"
          titulo="Leer la política"
          detalle="Qué datos usamos y para qué"
          etiquetaAccesible="Leer la política de tratamiento de datos"
          alPulsar={() => router.push("/politica")}
        />
      </Tarjeta>

      {error && <CuentaAviso texto={error} />}
      {problemas.length > 0 && empezo && <CuentaAviso tono="info" icono="infoLinea" texto={problemas[0]} />}
      <Boton titulo="Crear cuenta" onPress={crear} cargando={cargando} deshabilitado={problemas.length > 0} />

      <CuentaEnlace href="/login" pregunta="¿Ya tienes cuenta?" texto="Entrar" />
    </PantallaFormulario>
  );
}
