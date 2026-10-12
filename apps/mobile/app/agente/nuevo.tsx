import * as Clipboard from "expo-clipboard";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useHogarActual } from "@/api/hogar";
import { crearAgente, ErrorApi } from "@/api/cliente";
import type { AgenteCreado } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { API_URL } from "@/lib/config";
import { colores, espacio } from "@/theme";

/** El token del agente se muestra UNA vez: en la base solo queda su hash. */
export default function VincularAgente() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const [nombre, setNombre] = useState("Computador de la casa");
  const [creado, setCreado] = useState<AgenteCreado | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!hogar) return null;

  async function crear() {
    setError(null);
    setCargando(true);
    try {
      setCreado(await crearAgente(hogar!.id, nombre.trim()));
      await cliente.invalidateQueries({ queryKey: ["agentes"] });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo crear. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const configuracion = creado ? `AGENT_API_URL=${API_URL}\nAGENT_TOKEN=${creado.token}` : "";

  return (
    <PantallaFormulario>
      <Texto variante="titulo">Vincular agente</Texto>
      <Texto color={colores.textoSecundario}>
        El agente es el programa que corre en un computador de tu casa, lee el enchufe por tu WiFi y manda los datos a la nube.
      </Texto>
      {!creado ? (
        <>
          <Campo etiqueta="Nombre del agente" value={nombre} onChangeText={setNombre} />
          {error && (
            <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
              {error}
            </Texto>
          )}
          <Boton titulo="Crear clave del agente" onPress={crear} cargando={cargando} deshabilitado={!nombre.trim()} />
        </>
      ) : (
        <>
          <Tarjeta style={{ gap: espacio.s }}>
            <Texto variante="subtitulo">Copia esto ahora</Texto>
            <Texto variante="secundario" color={colores.ambar} style={{ fontWeight: "700" }}>
              Se muestra una sola vez. Si lo pierdes, crea otra clave.
            </Texto>
            <Texto selectable style={{ fontFamily: "Courier", fontSize: 15 }}>{configuracion}</Texto>
            <Boton
              titulo={copiado ? "Copiado" : "Copiar"}
              variante="secundario"
              onPress={async () => {
                await Clipboard.setStringAsync(configuracion);
                setCopiado(true);
              }}
            />
          </Tarjeta>
          <Tarjeta style={{ gap: espacio.s }}>
            <Texto variante="subtitulo">Qué hacer con esto</Texto>
            <Texto variante="secundario">1. En el computador de tu casa, pega estas dos líneas en el archivo .env del agente.</Texto>
            <Texto variante="secundario">2. Corre el agente: python -m agent.</Texto>
            <Texto variante="secundario">3. Aquí en Mi casa verás "Conectado" en menos de un minuto.</Texto>
          </Tarjeta>
        </>
      )}
    </PantallaFormulario>
  );
}
