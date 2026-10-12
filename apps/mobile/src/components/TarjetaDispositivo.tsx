import { Pressable, View } from "react-native";

import type { DispositivoResumen } from "@/api/tipos";
import { formatoCOP, formatoPotencia } from "@/lib/formato";
import { colores } from "@/theme";

import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

function estado(d: DispositivoResumen): { texto: string; color: string } {
  if (d.encendido == null) return { texto: "Sin datos", color: colores.apagado };
  return d.encendido ? { texto: "Encendido", color: colores.verde } : { texto: "Apagado", color: colores.apagado };
}

export function TarjetaDispositivo({ dispositivo: d, alPulsar }: { dispositivo: DispositivoResumen; alPulsar: () => void }) {
  const e = estado(d);
  const retraso = d.ultima_lectura != null && !d.en_linea;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d.nombre}, ${e.texto}. Hoy ${formatoCOP(d.costo_hoy_cop)}`}
      onPress={alPulsar}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, minHeight: 44 })}
    >
      <Tarjeta>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Texto variante="subtitulo" style={{ flexShrink: 1 }}>
            {d.nombre}
          </Texto>
          <Texto variante="secundario" color={e.color} style={{ fontWeight: "700" }}>
            {e.texto}
          </Texto>
        </View>
        <Texto variante="cifraMedia">{formatoCOP(d.costo_hoy_cop)}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          hoy
          {d.potencia_w != null && d.encendido ? ` · ${formatoPotencia(d.potencia_w)} ahora` : ""}
        </Texto>
        {retraso && (
          <Texto variante="secundario" color={colores.ambar} style={{ fontWeight: "700" }}>
            Dato con retraso
          </Texto>
        )}
      </Tarjeta>
    </Pressable>
  );
}
