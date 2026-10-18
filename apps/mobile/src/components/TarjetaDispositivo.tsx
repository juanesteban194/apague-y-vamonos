import { Pressable, View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import type { DispositivoResumen } from "@/api/tipos";
import { useControlDispositivo } from "@/features/consumo/control";
import { formatoPotencia } from "@/lib/formato";
import { colores, espacio, radios } from "@/theme";

import { pesos } from "./InicioFormato";
import { InterruptorCompacto } from "./InterruptorCompacto";
import { Texto } from "./Texto";

function estado(d: DispositivoResumen): { texto: string; color: string; punto: string } {
  if (d.encendido == null) return { texto: "Sin datos", color: colores.textoSecundario, punto: "rgba(20,19,17,0.18)" };
  return d.encendido
    ? { texto: "Encendido", color: colores.verde, punto: colores.semaforoVerde }
    : { texto: "Apagado", color: colores.textoSecundario, punto: "rgba(20,19,17,0.28)" };
}

type Props = {
  dispositivo: DispositivoResumen;
  alPulsar: () => void;
  /** Su parte frente al que más gasta hoy (0 a 1), para la barra fina. Sin valor no se dibuja barra. */
  proporcion?: number;
};

/** Un dispositivo en la lista de Inicio: nombre y lo que lleva hoy, su estado con un punto de color, una barra fina con su parte
 *  del gasto y, a la derecha, el interruptor para prenderlo o apagarlo sin entrar a su pantalla. Va dentro de una lista agrupada. */
export function TarjetaDispositivo({ dispositivo: d, alPulsar, proporcion }: Props) {
  const { hogar } = useHogarActual();
  const control = useControlDispositivo(hogar?.id, d.id);
  const e = estado(d);
  const retraso = d.ultima_lectura != null && !d.en_linea;
  const conBarra = proporcion != null && Number.isFinite(proporcion);
  return (
    <View style={{ paddingLeft: 16, paddingRight: 6, paddingVertical: 10, gap: espacio.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${d.nombre}, ${e.texto}. Hoy ${pesos(d.costo_hoy_cop)}`}
          onPress={alPulsar}
          style={({ pressed }) => ({ flex: 1, minHeight: 44, justifyContent: "center", gap: 3, paddingVertical: 4, opacity: pressed ? 0.6 : 1 })}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: espacio.m }}>
            <Texto style={{ flex: 1, fontWeight: "600" }} numberOfLines={1}>
              {d.nombre}
            </Texto>
            <Texto style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}>{pesos(d.costo_hoy_cop)}</Texto>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: e.punto }} />
            <Texto variante="secundario" color={e.color} style={{ fontWeight: "500" }}>
              {e.texto}
            </Texto>
            {retraso ? (
              <Texto variante="secundario" color={colores.ambar} style={{ fontWeight: "500" }}>
                Dato con retraso
              </Texto>
            ) : (
              d.potencia_w != null &&
              d.encendido && (
                <Texto variante="secundario" color={colores.textoSecundario}>
                  {`· ${formatoPotencia(d.potencia_w)} ahora`}
                </Texto>
              )
            )}
          </View>
          {conBarra && proporcion > 0 && (
            <View style={{ height: 5, borderRadius: radios.total, backgroundColor: "rgba(20,19,17,0.05)", marginTop: 8, marginBottom: 2 }}>
              <View style={{ width: `${Math.max(3, Math.min(1, proporcion) * 100)}%`, height: "100%", borderRadius: radios.total, backgroundColor: "rgba(20,19,17,0.42)" }} />
            </View>
          )}
        </Pressable>
        <InterruptorCompacto nombre={d.nombre} encendido={d.encendido} cargando={control.enviando} alCambiar={(encender) => void control.cambiar(encender)} />
      </View>
      {control.error && (
        <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "500", paddingRight: 10 }}>
          {control.error}
        </Texto>
      )}
    </View>
  );
}
