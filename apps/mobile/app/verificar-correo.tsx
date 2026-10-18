import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { enviarCodigoDeVerificacion, ErrorApi, verificarCorreo } from "@/api/cliente";
import { usePerfilActual } from "@/api/perfil";
import { Boton } from "@/components/Boton";
import { CuentaAviso, CuentaCampoCodigo, CuentaEncabezado } from "@/components/CuentaPiezas";
import { Icono } from "@/components/Icono";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { exito } from "@/lib/haptica";
import { colores, espacio } from "@/theme";

/** Comprobar que el correo es tuyo con un código de 6 números. No bloquea nada: sirve para poder recuperar la cuenta si olvidas la contraseña. */
export default function VerificarCorreo() {
  const cliente = useQueryClient();
  const { data: perfil } = usePerfilActual();
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setError(null);
    setCargando(true);
    try {
      await enviarCodigoDeVerificacion();
      setEnviado(true);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo enviar el código. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmar() {
    setError(null);
    setCargando(true);
    try {
      cliente.setQueryData(["perfil"], await verificarCorreo(codigo.trim()));
      exito();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo verificar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (perfil?.email_verificado) {
    return (
      <PantallaFormulario centrado={false}>
        <CuentaEncabezado icono="ok" tono="verde" titulo="Tu correo está verificado" subtitulo={perfil.email} />
        <Boton titulo="Listo" onPress={() => router.back()} />
      </PantallaFormulario>
    );
  }

  return (
    <PantallaFormulario centrado={false}>
      <CuentaEncabezado
        icono="correo"
        titulo="Confirma tu correo"
        subtitulo={`Te mandamos un código de 6 números a ${perfil?.email ?? "tu correo"}. Así podrás recuperar tu cuenta si algún día olvidas la contraseña.`}
      />

      <View style={{ gap: espacio.m }}>
        <Boton
          titulo={enviado ? "Enviar otro código" : "Enviarme el código"}
          variante="secundario"
          icono={<Icono nombre={enviado ? "refrescar" : "correo"} tamano={20} color={colores.texto} />}
          onPress={enviar}
          cargando={cargando && !codigo}
        />
        {enviado && <CuentaAviso tono="ok" texto="Listo, revisa tu correo (y «spam»). El código vale 15 minutos." />}
      </View>

      <CuentaCampoCodigo value={codigo} onChangeText={setCodigo} />
      {error && <CuentaAviso texto={error} />}
      <Boton titulo="Verificar" onPress={confirmar} cargando={cargando && !!codigo} deshabilitado={!/^\d{6}$/.test(codigo.trim())} />
    </PantallaFormulario>
  );
}
