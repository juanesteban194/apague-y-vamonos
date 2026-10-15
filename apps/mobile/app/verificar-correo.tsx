import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";

import { enviarCodigoDeVerificacion, ErrorApi, verificarCorreo } from "@/api/cliente";
import { usePerfilActual } from "@/api/perfil";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Icono } from "@/components/Icono";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
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
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo verificar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (perfil?.email_verificado) {
    return (
      <PantallaFormulario>
        <Tarjeta style={{ gap: espacio.s, backgroundColor: colores.verdeFondo, borderColor: colores.verdeSuave }}>
          <Icono nombre="ok" color={colores.verde} tamano={32} />
          <Texto variante="subtitulo">Tu correo está verificado</Texto>
          <Texto>{perfil.email}</Texto>
        </Tarjeta>
        <Boton titulo="Listo" onPress={() => router.back()} />
      </PantallaFormulario>
    );
  }

  return (
    <PantallaFormulario>
      <Texto variante="titulo">Verificar mi correo</Texto>
      <Texto color={colores.textoSecundario}>
        Te enviamos un código de 6 números a {perfil?.email ?? "tu correo"} para comprobar que es tuyo. Así podrás recuperar tu cuenta si algún día olvidas la contraseña.
      </Texto>
      <Boton titulo={enviado ? "Enviar otro código" : "Enviarme el código"} variante={enviado ? "secundario" : "primario"} onPress={enviar} cargando={cargando && !codigo} />
      {enviado && <Texto variante="secundario" color={colores.textoSecundario}>Listo, revisa tu correo (y «spam»). Vale 15 minutos.</Texto>}
      <Campo etiqueta="Código de 6 números" keyboardType="number-pad" maxLength={6} value={codigo} onChangeText={setCodigo} />
      {error && <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>{error}</Texto>}
      <Boton titulo="Verificar" onPress={confirmar} cargando={cargando && !!codigo} deshabilitado={!/^\d{6}$/.test(codigo.trim())} />
    </PantallaFormulario>
  );
}
