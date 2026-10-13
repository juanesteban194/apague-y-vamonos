import { View } from "react-native";

import type { Prepago } from "@/api/tipos";
import { diaYNumero } from "@/lib/fechas";
import { formatoCOP } from "@/lib/formato";
import { colores } from "@/theme";

import { Boton } from "./Boton";
import { Texto } from "./Texto";

type Props = { prepago: Prepago | undefined; alActualizar: () => void };

/** Tarjeta ámbar del mockup ("Medidor prepago · $28.500 de saldo · le alcanza hasta el jueves 10"). Rojo si quedan menos de 48 h. */
export function TarjetaPrepago({ prepago, alActualizar }: Props) {
  const rojo = prepago?.nivel === "rojo";
  const fondo = rojo ? colores.rojoFondo : colores.ambarFondo;
  const acento = rojo ? colores.rojo : colores.ambar;

  let mensaje: string;
  if (!prepago || prepago.estado === "sin_registros") mensaje = "Anote el saldo que muestra su medidor y le calculamos cuántos días le alcanza.";
  else if (prepago.estado === "datos_insuficientes") mensaje = "Vuelva a anotar su saldo mañana: con dos anotaciones de días distintos calculamos cuánto le dura.";
  else if (prepago.dias_restantes == null) mensaje = "Su saldo no ha bajado: todavía no hay un ritmo de gasto que proyectar.";
  else if (prepago.dias_restantes === 0) mensaje = "Al ritmo de los últimos 3 días el saldo ya debería haberse acabado. Revise su medidor.";
  else mensaje = `Al ritmo de los últimos 3 días le alcanza hasta el ${diaYNumero(prepago.se_acaba_el!)}. Son unos ${Math.max(1, Math.round(prepago.dias_restantes))} ${Math.round(prepago.dias_restantes) <= 1 ? "día" : "días"}.`;

  return (
    <View style={{ backgroundColor: fondo, borderWidth: 1, borderColor: "rgba(201,134,11,0.28)", borderRadius: 22, padding: 20, gap: 8 }}>
      <Texto variante="secundario" color={acento} style={{ fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
        {rojo ? "Medidor prepago · se acaba pronto" : "Medidor prepago"}
      </Texto>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Texto variante="cifra">{formatoCOP(prepago?.saldo_cop)}</Texto>
        <Texto color={colores.textoSecundario} style={{ fontWeight: "600" }}>
          de saldo
        </Texto>
      </View>
      <Texto>{mensaje}</Texto>
      <View style={{ marginTop: 8 }}>
        <Boton titulo={prepago?.saldo_cop == null ? "Anotar mi saldo" : "Actualizar saldo"} onPress={alActualizar} />
      </View>
    </View>
  );
}
