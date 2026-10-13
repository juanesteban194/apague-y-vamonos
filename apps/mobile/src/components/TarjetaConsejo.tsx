import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import type { Consejo } from "@/api/tipos";
import { formatoCOP } from "@/lib/formato";
import { colores } from "@/theme";

import { Boton } from "./Boton";
import { Texto } from "./Texto";

const ICONOS: Record<string, keyof typeof Ionicons.glyphMap> = {
  receipt: "receipt", gauge: "speedometer", plug: "flash", alert: "alert-circle", chart: "bar-chart", moon: "moon", swap: "swap-horizontal",
};
const BOTON: Record<NonNullable<Consejo["accion"]>, string> = {
  historial: "Anotar mis facturas", medidor: "Anotar lectura del medidor", enchufe: "Conectar un enchufe", rutina: "Programar el apagado", simulador: "Comparar con uno nuevo",
};

type Props = { consejo: Consejo; alActuar: (c: Consejo) => void };

/** Un consejo del mockup: ícono en cajita verde, título, explicación y, si ahorra, "Ahorra unos $X al mes". */
export function TarjetaConsejo({ consejo: c, alActuar }: Props) {
  const advertencia = c.tipo === "sobre_promedio";
  return (
    <View style={{ backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 20, padding: 17, flexDirection: "row", gap: 14 }}>
      <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: advertencia ? colores.ambarFondo : colores.verdeFondo }}>
        <Ionicons name={ICONOS[c.icono] ?? "bulb"} size={24} color={advertencia ? colores.ambar : colores.verde} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Texto variante="subtitulo" style={{ fontWeight: "800" }}>
          {c.titulo}
        </Texto>
        <Texto variante="secundario" color="#4A4640" style={{ lineHeight: 22 }}>
          {c.mensaje}
        </Texto>
        {c.ahorro_cop_mes != null && (
          <View style={{ alignSelf: "flex-start", backgroundColor: colores.verdeFondo, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}>
            <Texto variante="secundario" color={colores.verde} style={{ fontWeight: "700" }}>
              Ahorra unos {formatoCOP(c.ahorro_cop_mes)} al mes
            </Texto>
          </View>
        )}
        {c.accion && (
          <View style={{ marginTop: 4 }}>
            <Boton titulo={BOTON[c.accion]} variante="secundario" onPress={() => alActuar(c)} />
          </View>
        )}
      </View>
    </View>
  );
}
