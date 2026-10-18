import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";

import { renombrarAgente, revocarAgente } from "@/api/cliente";
import { useAgentes } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Vacio } from "@/components/GestionPiezas";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { IconoEnCaja } from "@/components/Primitivos";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaAgente } from "@/components/TarjetaAgente";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

/** Un eslabón del camino de los datos: ícono y nombre corto. */
function Eslabon({ icono, texto, tono }: { icono: NombreIcono; texto: string; tono?: "tinta" | "neutro" }) {
  return (
    <View style={{ alignItems: "center", gap: 6, flex: 1 }}>
      <IconoEnCaja nombre={icono} tono={tono ?? "neutro"} tamano={44} />
      <Texto variante="secundario" color={colores.textoSecundario} style={{ textAlign: "center" }}>
        {texto}
      </Texto>
    </View>
  );
}

const Flecha = () => (
  <View style={{ height: 44, justifyContent: "center" }}>
    <Icono nombre="flechaDerecha" tamano={18} color="rgba(20,19,17,0.3)" />
  </View>
);

/** Los agentes de la casa: los programas que leen los enchufes por WiFi. Cada agente explica qué hace y en qué estado está. */
export default function Agentes() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: agentes } = useAgentes(hogar?.id);

  return (
    <Pantalla conCabecera>
      <SugerenciaAyuda tema="agentes" />
      <Tarjeta style={{ gap: espacio.l, paddingVertical: 20 }}>
        <Texto variante="subtitulo">¿Qué hace un agente?</Texto>
        <View aria-hidden style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Eslabon icono="enchufeLinea" texto="Enchufes" />
          <Flecha />
          <Eslabon icono="agenteLinea" texto="Agente" tono="tinta" />
          <Flecha />
          <Eslabon icono="telefono" texto="Tu celular" />
        </View>
        <View style={{ gap: espacio.s }}>
          <Texto color={colores.textoSecundario}>
            Es un programa en un computador de tu casa. Lee tus enchufes por la WiFi cada 5 segundos y le manda los datos a la app.
          </Texto>
          <Texto color={colores.textoSecundario}>Cada enchufe lo lee un solo agente, el que le asignes en Enchufes. Solo ese agente puede prenderlo o apagarlo.</Texto>
        </View>
      </Tarjeta>

      {agentes?.length === 0 && (
        <Tarjeta>
          <Vacio icono="agenteLinea" tono="ambar" titulo="Aún no tienes un agente" texto="Sin agente vinculado no llegarán datos. Agrégalo con un código de 6 números.">
            <Boton titulo="Agregar agente" icono={<Icono nombre="mas" color={colores.sobrePrimario} tamano={20} />} onPress={() => router.push("/agente/nuevo")} />
          </Vacio>
        </Tarjeta>
      )}

      {agentes && agentes.length > 0 && (
        <>
          <Texto variante="secundario" color={colores.textoSecundario} accessibilityRole="header" style={{ fontWeight: "600", marginLeft: 4, marginBottom: -espacio.s }}>
            {agentes.length === 1 ? "Tu agente" : `Tus ${agentes.length} agentes`}
          </Texto>
          {agentes.map((a) => (
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
        </>
      )}
      {/* Mientras carga (o si la lista no llega) también se puede agregar uno */}
      {agentes?.length !== 0 && <Boton titulo="Agregar agente" variante="secundario" icono={<Icono nombre="mas" tamano={20} />} onPress={() => router.push("/agente/nuevo")} />}
    </Pantalla>
  );
}
