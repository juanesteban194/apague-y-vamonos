import { Pressable, View } from "react-native";

import type { Rutina } from "@/api/tipos";
import { haceCuanto } from "@/lib/fechas";
import { formatoCOP } from "@/lib/formato";
import { mostrarHora, textoDias } from "@/lib/horarios";
import { AREA_TOQUE_MIN, BORDE_FINO, colores, espacio, radios, sombras } from "@/theme";

import { Icono } from "./Icono";
import { IconoEnCaja, Pastilla } from "./Primitivos";
import { Texto } from "./Texto";

/** Una hora dentro de la frase del horario: más grande que el texto y con números tabulares. */
function Hora({ hora, pausada }: { hora: string; pausada: boolean }) {
  return (
    <Texto variante="subtitulo" color={pausada ? colores.textoSecundario : colores.texto} style={{ fontSize: 20, fontWeight: "600", letterSpacing: -0.3, fontVariant: ["tabular-nums"] }}>
      {hora}
    </Texto>
  );
}

/** Rutina de apagado de un vistazo: el dispositivo y sus días, el horario como una frase con las horas resaltadas y lo que ahorra.
 *  Toda la tarjeta abre la rutina. */
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
        <View style={{ flex: 1, gap: 1 }}>
          <Texto variante="cuerpo" style={{ fontWeight: "600" }} numberOfLines={2}>
            {r.dispositivo_nombre}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {textoDias(r.dias)}
          </Texto>
        </View>
        {pausada ? <Pastilla texto="Pausada" /> : <Icono nombre="adelante" tamano={18} color="rgba(20,19,17,0.3)" />}
      </View>

      {/* El horario como una frase que se lee sola, con las horas resaltadas */}
      <Texto color={colores.textoSecundario} style={{ lineHeight: 28 }}>
        Apaga a las <Hora hora={mostrarHora(r.hora_apagado)} pausada={pausada} />
        {r.hora_encendido && (
          <>
            {" · "}prende a las <Hora hora={mostrarHora(r.hora_encendido)} pausada={pausada} />
          </>
        )}
      </Texto>

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
