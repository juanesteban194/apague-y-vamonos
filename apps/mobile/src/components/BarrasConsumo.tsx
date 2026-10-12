import { useWindowDimensions } from "react-native";
import { VictoryAxis, VictoryBar, VictoryChart } from "victory-native";

import type { Periodo, PuntoConsumo } from "@/api/tipos";
import { etiquetaPunto } from "@/lib/fechas";
import { colores, TEXTO_MIN } from "@/theme";

type Props = { serie: PuntoConsumo[]; periodo: Periodo };

/** Barras de costo (COP) por hora, día de la semana o día del mes. */
export function BarrasConsumo({ serie, periodo }: Props) {
  const { width } = useWindowDimensions();
  const etiquetas = serie.map((p) => etiquetaPunto(p.inicio, periodo));
  const cada = periodo === "dia" ? 4 : periodo === "mes" ? 5 : 1; // no saturar el eje
  const datos = serie.map((p, i) => ({ x: i, y: p.costo_cop ?? 0 }));

  return (
    <VictoryChart width={width - 32} height={240} domainPadding={{ x: 12 }} padding={{ top: 12, bottom: 40, left: 56, right: 12 }}>
      <VictoryAxis
        tickValues={datos.map((d) => d.x)}
        tickFormat={(i: number) => (i % cada === 0 ? etiquetas[i] : "")}
        style={{ tickLabels: { fontSize: TEXTO_MIN, fill: colores.textoSecundario }, axis: { stroke: colores.borde } }}
      />
      <VictoryAxis
        dependentAxis
        tickCount={4}
        tickFormat={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v >= 10 ? String(Math.round(v)) : v.toFixed(1))}
        style={{ tickLabels: { fontSize: TEXTO_MIN, fill: colores.textoSecundario }, grid: { stroke: colores.borde }, axis: { stroke: "transparent" } }}
      />
      <VictoryBar data={datos} style={{ data: { fill: colores.primario } }} cornerRadius={{ top: 3 }} />
    </VictoryChart>
  );
}
