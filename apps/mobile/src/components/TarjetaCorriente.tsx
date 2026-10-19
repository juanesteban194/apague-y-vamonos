import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { obtenerCorriente } from "@/api/cliente";
import type { Corriente } from "@/api/tipos";
import { formatoAmperios } from "@/lib/formato";
import { BORDE_FINO, colores, espacio } from "@/theme";

import { IconoEnCaja, Pastilla, type Tono } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

const ESTADOS: Record<Corriente["estado"], { texto: string; tono: Tono }> = {
  aprendiendo: { texto: "Aprendiendo", tono: "neutro" },
  apagado: { texto: "Apagado", tono: "neutro" },
  normal: { texto: "Normal", tono: "verde" },
  alta: { texto: "Más de lo normal", tono: "ambar" },
  baja: { texto: "Menos de lo normal", tono: "ambar" },
};

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${valor}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: espacio.m, paddingVertical: espacio.s }}>
      <Texto color={colores.textoSecundario}>{etiqueta}</Texto>
      <Texto style={{ fontWeight: "600", fontVariant: ["tabular-nums"], flexShrink: 1, textAlign: "right" }}>{valor}</Texto>
    </View>
  );
}

/** Cuánta corriente usa de costumbre el dispositivo de este enchufe y cuánta ahora. Si se sale mucho de lo normal, llega un aviso:
 *  puede que haya otro dispositivo conectado (lo calcula el servidor). */
export function TarjetaCorriente({ hogarId, dispositivoId }: { hogarId: string; dispositivoId: string }) {
  const { data } = useQuery({
    queryKey: ["corriente", dispositivoId],
    queryFn: () => obtenerCorriente(hogarId, dispositivoId),
    refetchInterval: 60_000,
  });
  if (!data) return null;
  const estado = ESTADOS[data.estado];
  const conBase = data.normal_ma != null && data.bajo_ma != null && data.alto_ma != null && data.estado !== "aprendiendo";
  return (
    <Tarjeta style={{ gap: espacio.m }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
        <IconoEnCaja nombre="rayo" tamano={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Corriente habitual
          </Texto>
        </View>
        <Pastilla texto={estado.texto} tono={estado.tono} />
      </View>
      {conBase && (
        <View style={{ borderTopWidth: BORDE_FINO, borderTopColor: colores.separador }}>
          <Fila etiqueta="Lo normal" valor={`${formatoAmperios(data.normal_ma!)} (de ${formatoAmperios(data.bajo_ma!)} a ${formatoAmperios(data.alto_ma!)})`} />
          <Fila etiqueta="Ahora" valor={data.ahora_ma != null ? formatoAmperios(data.ahora_ma) : "Apagado"} />
        </View>
      )}
      <Texto variante="secundario" color={colores.textoSecundario}>
        {conBase
          ? "Si pasa mucha más o mucha menos corriente que lo normal durante 15 minutos, te avisamos: puede que haya otro dispositivo conectado a este enchufe."
          : "Estamos aprendiendo cuánta corriente usa este dispositivo. Con 2 días de uso te avisamos si pasa algo raro, como otro dispositivo conectado al mismo enchufe."}
      </Texto>
    </Tarjeta>
  );
}
