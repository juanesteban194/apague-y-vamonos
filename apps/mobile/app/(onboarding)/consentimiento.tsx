import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { aceptarConsentimiento, cerrarSesion, ErrorApi } from "@/api/cliente";
import { usePerfilActual } from "@/api/perfil";
import { Boton } from "@/components/Boton";
import { CuentaAviso, CuentaEncabezado } from "@/components/CuentaPiezas";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { FilaLista, Separador } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { exito } from "@/lib/haptica";
import { TEXTO_CONSENTIMIENTO } from "@/lib/textos";
import { colores, espacio } from "@/theme";

/** Cuentas nuevas de Google: aún no han aceptado el tratamiento de datos (Ley 1581) y la API no les sirve nada hasta que lo hagan.
 *  Primero lo esencial en tres filas, luego el texto exacto que se autoriza y el enlace a la política. */
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
      exito();
      cliente.setQueryData(["perfil"], actualizado); // la navegación pasa sola a la siguiente pantalla
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario>
      <CuentaEncabezado
        icono="escudo"
        tono="verde"
        titulo={perfil ? `Hola, ${perfil.nombre.split(" ")[0]}` : "Hola"}
        subtitulo="Antes de empezar, necesitamos tu permiso para usar tus datos."
      />

      <Tarjeta style={{ padding: 0, gap: 0 }}>
        <FilaLista icono="casaLinea" titulo="Qué usamos" detalle="Tu nombre, tu correo y el consumo de energía de tu casa." />
        <Separador sangria={66} />
        <FilaLista icono="grafica" titulo="Para qué" detalle="Calcular tu consumo y su costo, avisarte y darte consejos de ahorro." />
        <Separador sangria={66} />
        <FilaLista icono="candado" titulo="Lo que nunca hacemos" detalle="Vender tus datos o usarlos para publicidad." />
        <Separador sangria={66} />
        <FilaLista
          icono="facturaLinea"
          titulo="Leer la política"
          detalle="Los detalles y tus derechos"
          etiquetaAccesible="Leer la política de tratamiento de datos"
          alPulsar={() => router.push("/politica")}
        />
      </Tarjeta>

      <View style={{ gap: espacio.xs, paddingHorizontal: 4 }}>
        <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "600" }}>
          Al aceptar dices:
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          «{TEXTO_CONSENTIMIENTO}»
        </Texto>
      </View>

      {error && <CuentaAviso texto={error} />}
      <View style={{ gap: espacio.xs }}>
        <Boton titulo="Acepto y continuar" onPress={aceptar} cargando={cargando} />
        <Boton titulo="No acepto, salir" variante="texto" onPress={() => void cerrarSesion()} deshabilitado={cargando} />
      </View>
    </PantallaFormulario>
  );
}
