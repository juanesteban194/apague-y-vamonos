import { Pressable, View } from "react-native";

import type { Rutina } from "@/api/tipos";
import { haceCuanto } from "@/lib/fechas";
import { formatoCOP } from "@/lib/formato";
import { mostrarHora, textoDias } from "@/lib/horarios";
import { colores } from "@/theme";

import { Texto } from "./Texto";

export function TarjetaRutina({ rutina: r, alPulsar }: { rutina: Rutina; alPulsar: () => void }) {
  const horario = `Apaga a las ${mostrarHora(r.hora_apagado)}${r.hora_encendido ? ` · prende a las ${mostrarHora(r.hora_encendido)}` : ""}`;
  const fallo = r.ultima_ejecucion?.resultado.startsWith("error");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${r.dispositivo_nombre}. ${horario}. ${textoDias(r.dias)}${r.activa ? "" : ". Pausada"}`}
      onPress={alPulsar}
      style={{ backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 18, padding: 16, gap: 4, minHeight: 44, opacity: r.activa ? 1 : 0.6 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Texto variante="cuerpo" style={{ fontWeight: "700", flex: 1 }}>
          {r.dispositivo_nombre}
        </Texto>
        {!r.activa && (
          <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "700" }}>
            Pausada
          </Texto>
        )}
      </View>
      <Texto variante="secundario">{horario}</Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>
        {textoDias(r.dias)}
      </Texto>
      {r.ahorro_estimado_cop_mes != null && (
        <Texto variante="secundario" color={colores.verde} style={{ fontWeight: "700" }}>
          Ahorra unos {formatoCOP(r.ahorro_estimado_cop_mes)} al mes
        </Texto>
      )}
      {r.ultima_ejecucion && (
        <Texto variante="secundario" color={fallo ? colores.rojo : colores.textoSecundario}>
          {fallo ? "No se pudo ejecutar" : r.ultima_ejecucion.accion === "apagar" ? "Se apagó" : "Se prendió"} {haceCuanto(r.ultima_ejecucion.cuando)}
        </Texto>
      )}
    </Pressable>
  );
}
