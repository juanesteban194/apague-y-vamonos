import { Pressable, View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import type { DispositivoResumen } from "@/api/tipos";
import { useControlDispositivo } from "@/features/consumo/control";
import { formatoCOP, formatoPotencia } from "@/lib/formato";
import { colores } from "@/theme";

import { InterruptorCompacto } from "./InterruptorCompacto";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

function estado(d: DispositivoResumen): { texto: string; color: string } {
  if (d.encendido == null) return { texto: "Sin datos", color: colores.apagado };
  return d.encendido ? { texto: "Encendido", color: colores.verde } : { texto: "Apagado", color: colores.apagado };
}

/** Un dispositivo en Inicio: lo que gasta y, a la derecha, el interruptor para prenderlo o apagarlo sin entrar a su pantalla. */
export function TarjetaDispositivo({ dispositivo: d, alPulsar }: { dispositivo: DispositivoResumen; alPulsar: () => void }) {
  const { hogar } = useHogarActual();
  const control = useControlDispositivo(hogar?.id, d.id);
  const e = estado(d);
  const retraso = d.ultima_lectura != null && !d.en_linea;
  return (
    <Tarjeta>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${d.nombre}, ${e.texto}. Hoy ${formatoCOP(d.costo_hoy_cop)}`}
          onPress={alPulsar}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1, minHeight: 44 })}
        >
          <Texto variante="subtitulo" style={{ flexShrink: 1 }}>
            {d.nombre}
          </Texto>
          <Texto variante="secundario" color={e.color} style={{ fontWeight: "700" }}>
            {e.texto}
          </Texto>
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
        </Pressable>
        <InterruptorCompacto nombre={d.nombre} encendido={d.encendido} cargando={control.enviando} alCambiar={(encender) => void control.cambiar(encender)} />
      </View>
      {control.error && (
        <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "600" }}>
          {control.error}
        </Texto>
      )}
    </Tarjeta>
  );
}
