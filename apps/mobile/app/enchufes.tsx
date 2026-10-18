import { router } from "expo-router";
import { Fragment } from "react";
import { View } from "react-native";

import { useAgentes, useDispositivos } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { iconoDelDispositivo, Vacio } from "@/components/GestionPiezas";
import { Icono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { IconoEnCaja, Separador } from "@/components/Primitivos";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaEnchufe } from "@/components/TarjetaEnchufe";
import { Texto } from "@/components/Texto";
import { useResumen } from "@/features/consumo/hooks";
import { haceCuanto } from "@/lib/fechas";
import { colores, espacio } from "@/theme";

/** Los enchufes de la casa, qué agente lee cada uno y si están enviando datos. Tocar uno abre sus ajustes (nombre, agente, borrar). */
export default function Enchufes() {
  const { hogar } = useHogarActual();
  const { data: dispositivos, isLoading } = useDispositivos(hogar?.id);
  const { data: resumen } = useResumen(hogar?.id);
  const { data: agentes } = useAgentes(hogar?.id);
  const estado = (id: string) => resumen?.dispositivos.find((d) => d.id === id);
  const conectados = dispositivos?.filter((d) => estado(d.id)?.en_linea).length ?? 0;
  const todos = !!dispositivos?.length && conectados === dispositivos.length;

  return (
    <Pantalla conCabecera>
      <SugerenciaAyuda tema="enchufes" />
      {dispositivos && dispositivos.length > 0 && (
        <Tarjeta style={{ gap: espacio.m }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <IconoEnCaja nombre="conectado" tono={todos ? "verde" : conectados > 0 ? "ambar" : "neutro"} tamano={40} />
            <View style={{ flex: 1, gap: 1 }}>
              <Texto variante="subtitulo">{conectados} de {dispositivos.length} enviando datos ahora</Texto>
              <Texto variante="secundario" color={colores.textoSecundario}>
                {todos ? "Todos tus enchufes están al día." : "Los que no envían datos no suman a tu consumo."}
              </Texto>
            </View>
          </View>
          {/* Una rayita por enchufe: verde si está enviando datos */}
          <View aria-hidden style={{ flexDirection: "row", gap: 4 }}>
            {dispositivos.map((d) => (
              <View key={d.id} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: estado(d.id)?.en_linea ? colores.semaforoVerde : colores.tarjetaHundida }} />
            ))}
          </View>
        </Tarjeta>
      )}

      {isLoading && <Texto color={colores.textoSecundario}>Cargando tus enchufes…</Texto>}

      {dispositivos?.length === 0 && (
        <Tarjeta>
          <Vacio icono="enchufeLinea" titulo="Aún no tienes enchufes" texto="Conecta tu primer enchufe inteligente para ver cuánto gasta cada dispositivo.">
            <Boton titulo="Conectar un enchufe" icono={<Icono nombre="mas" color={colores.sobrePrimario} tamano={20} />} onPress={() => router.push("/enchufe/nuevo")} />
          </Vacio>
        </Tarjeta>
      )}

      {dispositivos && dispositivos.length > 0 && (
        <>
          <Texto variante="secundario" color={colores.textoSecundario} accessibilityRole="header" style={{ fontWeight: "600", marginLeft: 4, marginBottom: -espacio.s }}>
            {dispositivos.length === 1 ? "Tu enchufe" : `Tus ${dispositivos.length} enchufes`}
          </Texto>
          <Tarjeta style={{ padding: 0, gap: 0, overflow: "hidden" }}>
            {dispositivos.map((d, i) => {
              const r = estado(d.id);
              const punto = r?.en_linea ? colores.semaforoVerde : r?.ultima_lectura ? colores.semaforoAmbar : colores.interruptorApagado;
              const detalle = r?.en_linea ? "Conectado" : r?.ultima_lectura ? `Sin señal desde ${haceCuanto(r.ultima_lectura)}` : "Todavía no ha enviado datos";
              const agente = agentes?.find((a) => a.id === d.agente_id)?.nombre ?? null;
              return (
                <Fragment key={d.id}>
                  {i > 0 && <Separador sangria={70} />}
                  <TarjetaEnchufe nombre={d.nombre} estado={detalle} punto={punto} agente={agente} icono={iconoDelDispositivo(d.tipo_aparato, d.nombre)} alPulsar={() => router.push(`/enchufe/${d.id}`)} />
                </Fragment>
              );
            })}
          </Tarjeta>
          <Texto variante="secundario" color={colores.textoSecundario} style={{ marginHorizontal: 4, marginTop: -espacio.s }}>
            Toca uno para cambiarle el nombre, elegir qué agente lo lee o calibrar sus vatios.
          </Texto>
        </>
      )}
      {/* Mientras carga (o si la lista no llega) también se puede conectar uno */}
      {dispositivos?.length !== 0 && <Boton titulo="Conectar un enchufe" variante="secundario" icono={<Icono nombre="mas" tamano={20} />} onPress={() => router.push("/enchufe/nuevo")} />}
    </Pantalla>
  );
}
