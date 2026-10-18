import { Pressable, View } from "react-native";

import type { Rutina } from "@/api/tipos";
import { haceCuanto } from "@/lib/fechas";
import { formatoCOP } from "@/lib/formato";
import { mostrarHora, textoDias } from "@/lib/horarios";
import { AREA_TOQUE_MIN, BORDE_FINO, colores, espacio, radios, sombras } from "@/theme";

import { Icono } from "./Icono";
import { IconoEnCaja, Pastilla } from "./Primitivos";
import { Texto } from "./Texto";

const INICIALES = ["L", "M", "M", "J", "V", "S", "D"]; // 0 = lunes, como en la API

/** Una hora con su etiqueta encima («Se apaga · 23:30»). */
function Hora({ etiqueta, hora, apagada }: { etiqueta: string; hora: string; apagada: boolean }) {
  return (
    <View style={{ gap: 0 }}>
      <Texto variante="secundario" color={colores.textoSecundario}>
        {etiqueta}
      </Texto>
      <Texto variante="cifraMedia" color={apagada ? colores.textoSecundario : colores.texto}>
        {hora}
      </Texto>
    </View>
  );
}

/** Rutina de apagado de un vistazo: el dispositivo, la hora (grande), los días como letras y lo que ahorra. Toda la tarjeta abre la rutina. */
export function TarjetaRutina({ rutina: r, alPulsar }: { rutina: Rutina; alPulsar: () => void }) {
  const horario = `Apaga a las ${mostrarHora(r.hora_apagado)}${r.hora_encendido ? ` · prende a las ${mostrarHora(r.hora_encendido)}` : ""}`;
  const fallo = r.ultima_ejecucion?.resultado.startsWith("error");
  const cuando = r.ultima_ejecucion && !Number.isNaN(Date.parse(r.ultima_ejecucion.cuando)) ? haceCuanto(r.ultima_ejecucion.cuando) : null;
  const pausada = !r.activa;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${r.dispositivo_nombre}. ${horario}. ${textoDias(r.dias)}${r.activa ? "" : ". Pausada"}`}
      onPress={alPulsar}
      style={({ pressed }) => [
        { backgroundColor: colores.tarjeta, borderWidth: BORDE_FINO, borderColor: colores.borde, borderRadius: radios.l, padding: 18, gap: espacio.l, minHeight: AREA_TOQUE_MIN },
        sombras.suave,
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Dispositivo y estado */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
        <IconoEnCaja nombre={pausada ? "luna" : "rutinaLinea"} tamano={40} />
        <Texto variante="cuerpo" style={{ fontWeight: "600", flex: 1 }} numberOfLines={2}>
          {r.dispositivo_nombre}
        </Texto>
        {pausada ? <Pastilla texto="Pausada" /> : <Icono nombre="adelante" tamano={18} color="rgba(20,19,17,0.3)" />}
      </View>

      {/* La hora es la protagonista */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: espacio.l }}>
        <Hora etiqueta="Se apaga" hora={mostrarHora(r.hora_apagado)} apagada={pausada} />
        {r.hora_encendido && (
          <>
            <View style={{ paddingBottom: 9 }}>
              <Icono nombre="flechaDerecha" tamano={18} color={colores.textoSecundario} />
            </View>
            <Hora etiqueta="Se prende" hora={mostrarHora(r.hora_encendido)} apagada={pausada} />
          </>
        )}
      </View>

      {/* Los siete días: en relieve y tinta los que aplica; tenues los demás */}
      <View style={{ flexDirection: "row", gap: 4, marginLeft: -4 }}>
        {INICIALES.map((letra, d) => {
          const aplica = r.dias.includes(d);
          return (
            <View
              key={d}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: aplica ? colores.tarjetaHundida : "transparent",
              }}
            >
              <Texto
                variante="secundario"
                color={aplica && !pausada ? colores.texto : "rgba(20,19,17,0.3)"}
                style={{ fontWeight: aplica ? "600" : "400", lineHeight: 18 }}
              >
                {letra}
              </Texto>
            </View>
          );
        })}
      </View>

      {(r.ahorro_estimado_cop_mes != null || r.ultima_ejecucion) && (
        <View style={{ gap: espacio.s }}>
          {r.ahorro_estimado_cop_mes != null && <Pastilla texto={`Ahorra unos ${formatoCOP(r.ahorro_estimado_cop_mes)} al mes`} tono="verde" icono="hoja" />}
          {r.ultima_ejecucion && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icono nombre={fallo ? "alertaLinea" : "okLinea"} tamano={18} color={fallo ? colores.rojo : colores.textoSecundario} />
              <Texto variante="secundario" color={fallo ? colores.rojo : colores.textoSecundario} style={{ flex: 1 }}>
                {fallo ? "No se pudo ejecutar" : r.ultima_ejecucion.accion === "apagar" ? "Se apagó" : "Se prendió"}
                {cuando ? ` ${cuando}` : ""}
              </Texto>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
