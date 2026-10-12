import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { aceptarConsentimiento, cerrarSesion, ErrorApi } from "@/api/cliente";
import { useSesion } from "@/api/sesion";
import { Boton } from "@/components/Boton";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { usePerfilActual } from "@/api/perfil";
import { TEXTO_CONSENTIMIENTO } from "@/lib/textos";
import { colores, espacio } from "@/theme";

/** Cuentas nuevas de Google: aún no han aceptado el tratamiento de datos (Ley 1581) y la API no les sirve nada hasta que lo hagan. */
export default function Consentimiento() {
  const cliente = useQueryClient();
  const { data: perfil } = usePerfilActual();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function aceptar() {
    setError(null);
    setCargando(true);
    try {
      const actualizado = await aceptarConsentimiento();
      cliente.setQueryData(["perfil"], actualizado); // la navegación pasa sola a la siguiente pantalla
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario>
      <Texto variante="titulo">{perfil ? `Hola, ${perfil.nombre.split(" ")[0]}` : "Hola"}</Texto>
      <Texto color={colores.textoSecundario}>Antes de empezar necesitamos tu autorización.</Texto>
      <Tarjeta style={{ gap: espacio.s }}>
        <Texto>{TEXTO_CONSENTIMIENTO}</Texto>
      </Tarjeta>
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo="Acepto y continuar" onPress={aceptar} cargando={cargando} />
      <Boton titulo="No acepto, salir" variante="secundario" onPress={() => void cerrarSesion()} deshabilitado={cargando} />
    </PantallaFormulario>
  );
}
