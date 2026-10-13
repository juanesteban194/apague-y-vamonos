import { router } from "expo-router";
import { View } from "react-native";

import { cerrarSesion } from "@/api/cliente";
import { useAgentes, useDispositivos } from "@/api/cuenta";
import { useHogarActual, useTarifa } from "@/api/hogar";
import { usePerfilActual } from "@/api/perfil";
import { Boton } from "@/components/Boton";
import { FilaDato } from "@/components/FilaDato";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaPrepago } from "@/components/TarjetaPrepago";
import { TarjetaRutina } from "@/components/TarjetaRutina";
import { Texto } from "@/components/Texto";
import { useResumen } from "@/features/consumo/hooks";
import { useHistorial } from "@/features/consejos/hooks";
import { usePrepago } from "@/features/prepago/hooks";
import { useRutinas } from "@/features/rutinas/hooks";
import { haceCuanto, mesDeTarifa } from "@/lib/fechas";
import { formatoNumero, formatoTarifa } from "@/lib/formato";
import { colores, espacio } from "@/theme";

const EN_LINEA_S = 60;
const estaConectado = (ultimaConexion: string | null) => !!ultimaConexion && Date.now() - Date.parse(ultimaConexion) < EN_LINEA_S * 1000;
const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

function Titulo({ texto, aparte }: { texto: string; aparte?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: espacio.s }}>
      <Texto variante="subtitulo" style={{ fontWeight: "800", fontSize: 19 }}>
        {texto}
      </Texto>
      {aparte && (
        <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "700" }}>
          {aparte}
        </Texto>
      )}
    </View>
  );
}

export default function MiCasa() {
  const { data: perfil } = usePerfilActual();
  const { hogar } = useHogarActual();
  const { data: tarifa, isError: sinTarifa } = useTarifa(hogar?.id);
  const { data: dispositivos } = useDispositivos(hogar?.id);
  const { data: resumen } = useResumen(hogar?.id);
  const { data: agentes } = useAgentes(hogar?.id);
  const { data: prepago } = usePrepago(hogar?.id);
  const { data: rutinas } = useRutinas(hogar?.id);
  const { data: facturas } = useHistorial(hogar?.id);

  const enLinea = (id: string) => resumen?.dispositivos.find((d) => d.id === id);
  const conectados = dispositivos?.filter((d) => enLinea(d.id)?.en_linea).length ?? 0;
  const mostrarPrepago = hogar?.tipo_medidor === "prepago" || (prepago && prepago.estado !== "sin_registros");

  return (
    <Pantalla>
      {hogar && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colores.primario, alignItems: "center", justifyContent: "center" }}>
            <Texto variante="titulo" color={colores.sobrePrimario} style={{ fontWeight: "800" }}>
              {iniciales(hogar.nombre)}
            </Texto>
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="titulo" style={{ fontSize: 24 }}>
              {hogar.nombre}
            </Texto>
            {hogar.barrio && <Texto color={colores.textoSecundario}>{hogar.barrio}</Texto>}
          </View>
        </View>
      )}

      {hogar && (
        <Tarjeta style={{ paddingVertical: 6 }}>
          <FilaDato etiqueta="Estrato" detalle="Según su factura de EPM" valor={String(hogar.estrato)} />
          <FilaDato
            etiqueta="Lo que le cobran"
            detalle={tarifa ? `Tarifa EPM de ${mesDeTarifa(tarifa.mes)}${tarifa.es_del_mes_actual ? "" : " (falta cargar la de este mes)"}` : sinTarifa ? "Aún no hay tarifa cargada" : "Cargando…"}
            valor={tarifa ? formatoTarifa(tarifa.cop_kwh_subsistencia) : "—"}
          />
          <FilaDato etiqueta="Tipo de medidor" detalle="Cómo le llega la energía" valor={hogar.tipo_medidor ? hogar.tipo_medidor[0].toUpperCase() + hogar.tipo_medidor.slice(1) : "Sin indicar"} ultima />
        </Tarjeta>
      )}
      <Boton titulo="Editar hogar" variante="secundario" onPress={() => router.push("/hogar/editar")} />

      {mostrarPrepago && <TarjetaPrepago prepago={prepago} alActualizar={() => router.push("/prepago")} />}

      <Titulo texto="Rutinas de apagado" />
      {rutinas?.length === 0 && <Texto color={colores.textoSecundario}>Programe que un aparato se apague solo a cierta hora, por ejemplo la plancha o el calentador.</Texto>}
      {rutinas?.map((r) => <TarjetaRutina key={r.id} rutina={r} alPulsar={() => router.push(`/rutina/${r.id}`)} />)}
      <Boton titulo="Nueva rutina" variante={rutinas?.length ? "secundario" : "primario"} onPress={() => router.push("/rutina/nueva")} />

      <Titulo texto="Enchufes conectados" aparte={dispositivos ? `${conectados} de ${dispositivos.length}` : undefined} />
      {dispositivos?.length === 0 && <Texto color={colores.textoSecundario}>Aún no has agregado enchufes.</Texto>}
      {dispositivos?.map((d) => {
        const r = enLinea(d.id);
        const punto = r?.en_linea ? colores.semaforoVerde : r?.ultima_lectura ? colores.semaforoAmbar : colores.interruptorApagado;
        const detalle = r?.en_linea ? "Conectado" : r?.ultima_lectura ? `Sin señal desde ${haceCuanto(r.ultima_lectura)}` : "Todavía no ha enviado datos";
        return (
          <Boton key={d.id} titulo={`${d.nombre} · ${detalle}`} variante="secundario" onPress={() => router.push(`/enchufe/${d.id}`)} indicador={punto} />
        );
      })}
      <Boton titulo="+ Conectar otro enchufe" variante="secundario" onPress={() => router.push("/enchufe/nuevo")} />

      <Titulo texto="Agente de la casa" />
      <Tarjeta style={{ gap: espacio.s }}>
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

      <Titulo texto="Facturas y medidor de EPM" />
      <Tarjeta style={{ gap: espacio.s }}>
        <Texto color={colores.textoSecundario}>
          {facturas?.promedio_kwh != null
            ? `Su promedio de las últimas facturas es de ${formatoNumero(facturas.promedio_kwh)} kWh al mes: contra ese número medimos cuánto ahorra.`
            : "Anote el histórico de su factura: es lo que usamos para decirle si va por encima o por debajo de lo normal."}
        </Texto>
        <Boton titulo={facturas?.promedio_kwh != null ? "Revisar mis facturas" : "Anotar mis facturas"} variante="secundario" onPress={() => router.push("/historial")} />
        <Texto color={colores.textoSecundario}>La lectura de su medidor nos dice cuánto lleva este mes toda la casa, no solo los enchufes.</Texto>
        <Boton titulo="Anotar lectura del medidor" variante="secundario" onPress={() => router.push("/medidor")} />
      </Tarjeta>

      <Titulo texto="Cuenta" />
      <Tarjeta style={{ gap: espacio.s }}>
        {perfil && (
          <>
            <Texto style={{ fontWeight: "700" }}>{perfil.nombre}</Texto>
            <Texto color={colores.textoSecundario}>
              {perfil.email}
              {perfil.tiene_google ? " · con Google" : ""}
            </Texto>
          </>
        )}
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => void cerrarSesion()} />
      </Tarjeta>
    </Pantalla>
  );
}
