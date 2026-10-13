import { router } from "expo-router";

import { useAgentes } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { haceCuanto } from "@/lib/fechas";
import { colores, espacio } from "@/theme";

const EN_LINEA_S = 60;
const estaConectado = (ultimaConexion: string | null) => !!ultimaConexion && Date.now() - Date.parse(ultimaConexion) < EN_LINEA_S * 1000;

/** Los agentes de la casa: los programas que leen los enchufes por WiFi. Cada agente explica qué hace y en qué estado está. */
export default function Agentes() {
  const { hogar } = useHogarActual();
  const { data: agentes } = useAgentes(hogar?.id);

  return (
    <Pantalla>
      <SugerenciaAyuda tema="agentes" />
      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">¿Qué hace un agente?</Texto>
        <Texto color={colores.textoSecundario}>
          Corre en un computador de tu casa, lee tus enchufes cada 5 segundos por la WiFi y manda los datos a la nube. Sin un agente conectado, la app no recibe lecturas.
        </Texto>
      </Tarjeta>
      {agentes?.length === 0 && (
        <Texto color={colores.ambar} style={{ fontWeight: "600" }}>Sin agente vinculado: no llegarán datos.</Texto>
      )}
      {agentes?.map((a) => {
        const en = estaConectado(a.ultima_conexion);
        return (
          <Tarjeta key={a.id}>
            <Texto style={{ fontWeight: "700" }}>{a.nombre}</Texto>
            <Texto color={en ? colores.verde : colores.textoSecundario} style={{ fontWeight: "600" }}>
              {!a.ultima_conexion ? "Nunca se ha conectado" : en ? "Conectado" : `Última conexión ${haceCuanto(a.ultima_conexion)}`}
            </Texto>
          </Tarjeta>
        );
      })}
      <Boton titulo="Vincular agente" variante={agentes?.length ? "secundario" : "primario"} onPress={() => router.push("/agente/nuevo")} />
    </Pantalla>
  );
}
