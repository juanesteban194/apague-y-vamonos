import { View } from "react-native";

import type { Prepago } from "@/api/tipos";
import { diaYNumero } from "@/lib/fechas";
import { formatoCOP } from "@/lib/formato";
import { colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { IconoEnCaja } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

type Props = { prepago: Prepago | undefined; alActualizar: () => void };

/** Saldo del medidor prepago y hasta cuándo alcanza («$28.500 de saldo · te alcanza hasta el jueves 10»). En rojo si quedan menos de 48 h.
 *  La usan Inicio y la pantalla de saldo prepago. */
export function TarjetaPrepago({ prepago, alActualizar }: Props) {
  const rojo = prepago?.nivel === "rojo";
  const acento = rojo ? colores.rojo : colores.textoSecundario;

  let mensaje: string;
  if (!prepago || prepago.estado === "sin_registros") mensaje = "Anota el saldo que muestra tu medidor y te decimos cuántos días te alcanza.";
  else if (prepago.estado === "datos_insuficientes") mensaje = "Vuelve a anotar tu saldo mañana: con dos anotaciones de días distintos calculamos cuánto te dura.";
  else if (prepago.dias_restantes == null) mensaje = "Tu saldo no ha bajado: todavía no hay un ritmo de gasto para proyectar.";
  else if (prepago.dias_restantes === 0) mensaje = "Al ritmo de los últimos 3 días el saldo ya debería haberse acabado. Revisa tu medidor.";
  else {
    const dias = Math.max(1, Math.round(prepago.dias_restantes));
    mensaje = `Al ritmo de los últimos 3 días te alcanza hasta el ${diaYNumero(prepago.se_acaba_el!)}. ${dias === 1 ? "Es más o menos un día." : `Son unos ${dias} días.`}`;
  }

  return (
    <Tarjeta variante={rojo ? "rojo" : "normal"} style={{ padding: 20, gap: espacio.m }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
        <IconoEnCaja nombre="prepagoLinea" tono={rojo ? "rojo" : prepago?.nivel === "verde" ? "verde" : "neutro"} tamano={36} />
        <Texto variante="etiqueta" color={acento} style={{ flex: 1 }}>
          {rojo ? "Medidor prepago · se acaba pronto" : "Medidor prepago"}
        </Texto>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: espacio.s }}>
        <Texto variante="cifraMedia">{formatoCOP(prepago?.saldo_cop)}</Texto>
        <Texto color={colores.textoSecundario}>de saldo</Texto>
      </View>
      <Texto color={rojo ? colores.texto : colores.textoSecundario}>{mensaje}</Texto>
      <View style={{ marginTop: espacio.xs }}>
        <Boton titulo={prepago?.saldo_cop == null ? "Anotar mi saldo" : "Actualizar saldo"} variante={rojo ? "primario" : "secundario"} onPress={alActualizar} />
      </View>
    </Tarjeta>
  );
}
