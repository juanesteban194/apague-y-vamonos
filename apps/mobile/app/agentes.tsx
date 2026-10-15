import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { renombrarAgente, revocarAgente } from "@/api/cliente";
import { useAgentes } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaAgente } from "@/components/TarjetaAgente";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

/** Los agentes de la casa: los programas que leen los enchufes por WiFi. Cada agente explica qué hace y en qué estado está. */
export default function Agentes() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: agentes } = useAgentes(hogar?.id);

  return (
    <Pantalla>
      <SugerenciaAyuda tema="agentes" />
      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">¿Qué hace un agente?</Texto>
        <Texto color={colores.textoSecundario}>
          Corre en un computador de tu casa, lee tus enchufes cada 5 segundos por la WiFi y manda los datos a la nube. Cada enchufe lo lee un solo agente, el que le asignes en Enchufes; solo ese agente puede prenderlo o apagarlo. Sin un agente conectado, la app no recibe lecturas.
        </Texto>
      </Tarjeta>
      {agentes?.length === 0 && (
        <Texto color={colores.ambar} style={{ fontWeight: "600" }}>Sin agente vinculado: no llegarán datos.</Texto>
      )}
      {agentes?.map((a) => (
        <TarjetaAgente
          key={a.id}
          agente={a}
          alRenombrar={async (nombre) => {
            await renombrarAgente(hogar!.id, a.id, nombre);
            await cliente.invalidateQueries({ queryKey: ["agentes"] });
          }}
          alUsarEnOtroComputador={() => router.push({ pathname: "/agente/nuevo", params: { agente: a.id } })}
          alEliminar={async () => {
            await revocarAgente(hogar!.id, a.id);
            await cliente.invalidateQueries();
          }}
        />
      ))}
      <Boton titulo="Agregar agente" variante={agentes?.length ? "secundario" : "primario"} onPress={() => router.push("/agente/nuevo")} />
    </Pantalla>
  );
}
