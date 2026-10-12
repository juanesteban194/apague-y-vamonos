import { router } from "expo-router";
import { View } from "react-native";

import { useAgentes, useDispositivos } from "@/api/cuenta";
import { cerrarSesion } from "@/api/cliente";
import { useHogarActual, useTarifa } from "@/api/hogar";
import { usePerfilActual } from "@/api/perfil";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { haceCuanto, mesDeTarifa } from "@/lib/fechas";
import { formatoTarifa } from "@/lib/formato";
import { colores, espacio } from "@/theme";

const EN_LINEA_S = 60;
const estaConectado = (ultimaConexion: string | null) => !!ultimaConexion && Date.now() - Date.parse(ultimaConexion) < EN_LINEA_S * 1000;

export default function MiCasa() {
  const { data: perfil } = usePerfilActual();
  const { hogar } = useHogarActual();
  const { data: tarifa, isError: sinTarifa } = useTarifa(hogar?.id);
  const { data: dispositivos } = useDispositivos(hogar?.id);
  const { data: agentes } = useAgentes(hogar?.id);

  return (
    <Pantalla>
      <Texto variante="titulo">Mi casa</Texto>

      {hogar && (
        <Tarjeta>
          <Texto variante="subtitulo">{hogar.nombre}</Texto>
          <Texto color={colores.textoSecundario}>
            Estrato {hogar.estrato}
            {hogar.barrio ? ` · ${hogar.barrio}` : ""}
            {hogar.tipo_medidor ? ` · Medidor ${hogar.tipo_medidor}` : ""}
          </Texto>
          <View style={{ marginTop: espacio.s }}>
            <Boton titulo="Editar hogar" variante="secundario" onPress={() => router.push("/hogar/editar")} />
          </View>
        </Tarjeta>
      )}

      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">Enchufes</Texto>
        {dispositivos?.length === 0 && <Texto color={colores.textoSecundario}>Aún no has agregado enchufes.</Texto>}
        {dispositivos?.map((d) => (
          <Boton key={d.id} titulo={d.nombre} variante="secundario" onPress={() => router.push(`/enchufe/${d.id}`)} />
        ))}
        <Boton titulo="Agregar enchufe" onPress={() => router.push("/enchufe/nuevo")} />
      </Tarjeta>

      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">Agente de la casa</Texto>
        <Texto color={colores.textoSecundario}>El programa que lee tus enchufes por WiFi y manda los datos a la nube.</Texto>
        {agentes?.length === 0 && <Texto color={colores.ambar} style={{ fontWeight: "600" }}>Sin agente vinculado: no llegarán datos.</Texto>}
        {agentes?.map((a) => (
          <Texto key={a.id} color={estaConectado(a.ultima_conexion) ? colores.verde : colores.textoSecundario} style={{ fontWeight: "600" }}>
            {a.nombre}:{" "}
            {!a.ultima_conexion ? "nunca se ha conectado" : estaConectado(a.ultima_conexion) ? "conectado" : `última conexión ${haceCuanto(a.ultima_conexion)}`}
          </Texto>
        ))}
        <Boton titulo="Vincular agente" variante={agentes?.length ? "secundario" : "primario"} onPress={() => router.push("/agente/nuevo")} />
      </Tarjeta>

      <Tarjeta>
        <Texto variante="subtitulo">Tarifa de energía (EPM)</Texto>
        {tarifa ? (
          <>
            <Texto color={colores.textoSecundario}>Mes de la tarifa: {mesDeTarifa(tarifa.mes)}</Texto>
            <Texto>Hasta el consumo de subsistencia: {formatoTarifa(tarifa.cop_kwh_subsistencia)}</Texto>
            <Texto>Por encima: {formatoTarifa(tarifa.cop_kwh_sobre_subsistencia)}</Texto>
            {!tarifa.es_del_mes_actual && <Texto variante="secundario" color={colores.ambar}>Falta cargar la tarifa del mes actual.</Texto>}
          </>
        ) : (
          <Texto color={sinTarifa ? colores.ambar : colores.textoSecundario}>{sinTarifa ? "Aún no hay tarifa cargada." : "Cargando…"}</Texto>
        )}
      </Tarjeta>

      <Tarjeta>
        <Texto variante="subtitulo">Cuenta</Texto>
        {perfil && (
          <>
            <Texto>{perfil.nombre}</Texto>
            <Texto color={colores.textoSecundario}>{perfil.email}{perfil.tiene_google ? " · con Google" : ""}</Texto>
          </>
        )}
        <View style={{ marginTop: espacio.s }}>
          <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => void cerrarSesion()} />
        </View>
      </Tarjeta>

      <Tarjeta>
        <Texto color={colores.textoSecundario}>Prepago y rutinas de apagado llegan en la siguiente fase.</Texto>
      </Tarjeta>
    </Pantalla>
  );
}
