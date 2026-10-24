import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import type { Periodo, PuntoConsumo } from "@/api/tipos";
import { detallePunto, etiquetaPunto, nombreMes } from "@/lib/fechas";
import { formatoCOP } from "@/lib/formato";
import { seleccionar } from "@/lib/haptica";
import { BORDE_FINO, colores, espacio } from "@/theme";

import { Texto } from "./Texto";

type Props = { serie: PuntoConsumo[]; periodo: Periodo };

const ALTO = 168; // alto del área de las barras
const ANCHO_EJE = 52; // columna de la derecha con los valores del eje
const ANCHO_EJE_MILES = 68; // «$30 mil» no cabe en 52
const CADA: Record<Periodo, number> = { dia: 6, semana: 1, mes: 2 }; // cada cuántas barras va una etiqueta, para no saturar el eje

/** Un tope «redondo» para el eje (1; 1,5; 2; 3; 4; 5; 6; 8 o 10 por una potencia de 10), justo por encima de la barra más alta. */
function topeRedondo(maximo: number): number {
  if (maximo <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  return ([1, 1.5, 2, 3, 4, 5, 6, 8, 10].find((m) => m * potencia >= maximo) ?? 10) * potencia;
}

/** Valor corto para el eje: $0, $5, $40, $1,2 mil. */
function pesosCortos(v: number): string {
  if (v === 0) return "$0";
  if (v >= 1000) return `$${String(Math.round(v / 100) / 10).replace(".", ",")} mil`;
  if (v >= 10) return `$${Math.round(v)}`;
  return `$${String(Math.round(v * 10) / 10).replace(".", ",")}`;
}

const mayuscula = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** Barras de costo (COP) por hora, por día de la semana o por mes (los últimos 12; el actual va hasta hoy). Dibujadas con vistas (sin librería de gráficas): se ven igual en iOS,
 *  Android y web y no dependen de medir el ancho. La barra más reciente con consumo va en tinta; las demás, en gris cálido.
 *  Al tocar una barra (o deslizar el dedo sobre la gráfica) se resalta y arriba dice qué momento es y cuánto costó. Con lector de pantalla,
 *  la gráfica es «ajustable»: deslizar arriba o abajo recorre las barras. */
export function BarrasConsumo({ serie, periodo }: Props) {
  const [elegida, setElegida] = useState<number | null>(null);
  const ancho = useRef(0);
  useEffect(() => setElegida(null), [periodo, serie.length]); // otro periodo: vuelve a lo de siempre

  const valores = serie.map((p) => p.costo_cop ?? 0);
  const maximo = Math.max(0, ...valores);
  const tope = topeRedondo(maximo);
  const anchoEje = tope >= 1000 ? ANCHO_EJE_MILES : ANCHO_EJE;
  const ultimo = valores.reduce((acc, v, i) => (v > 0 ? i : acc), -1);
  // En «mes» se resalta siempre el mes actual (el último); en día y semana, la barra más reciente con consumo.
  const destacado = periodo === "mes" || ultimo < 0 ? serie.length - 1 : ultimo;
  const resaltada = elegida ?? destacado;
  const etiquetas = serie.map((p) => mayuscula(etiquetaPunto(p.inicio, periodo)));
  const cada = CADA[periodo];
  const unidad = periodo === "dia" ? "hora" : periodo === "semana" ? "día" : "mes";
  const ultimaIso = serie[serie.length - 1]?.inicio ?? "";

  const cuando = (i: number) => (periodo === "dia" ? `a las ${etiquetas[i]}:00` : periodo === "semana" ? `el ${etiquetas[i].toLowerCase()}` : `en ${nombreMes(serie[i].inicio, ultimaIso)}`);
  const iMax = valores.indexOf(maximo);
  const resumen =
    maximo > 0
      ? `Gráfica del costo por ${unidad}. Lo más alto: ${formatoCOP(maximo)} ${cuando(iMax)}. El último: ${formatoCOP(valores[destacado])} ${cuando(destacado)}.`
      : `Gráfica del costo por ${unidad}. Aún no hay consumo en este periodo.`;
  const detalle = (i: number) => `${detallePunto(serie[i].inicio, periodo, ultimaIso)}: ${formatoCOP(valores[i])}`;

  const separacion = serie.length > 12 ? 2 : 8;

  const nombreDestacado = periodo === "dia" ? "Esta hora" : periodo === "semana" ? "Hoy" : "Este mes";
  // En «mes» las etiquetas se cuentan desde el final, para que el mes actual siempre tenga la suya.
  const conEtiqueta = (i: number) => (periodo === "mes" ? (serie.length - 1 - i) % cada === 0 : i % cada === 0);

  function elegir(i: number) {
    const n = Math.max(0, Math.min(serie.length - 1, i));
    if (n !== elegida) seleccionar();
    setElegida(n);
  }
  const bajoElDedo = (x: number) => (ancho.current > 0 ? Math.floor((x / ancho.current) * serie.length) : null);
  const tocar = (x: number) => {
    const i = bajoElDedo(x);
    if (i != null) elegir(i);
  };

  // Leyenda: la barra elegida con su momento completo; si no hay, la más reciente (en «mes» sobra: la pantalla ya muestra lo de este mes).
  const leyenda = elegida != null ? { texto: detallePunto(serie[elegida].inicio, periodo, ultimaIso), valor: valores[elegida] } : periodo !== "mes" ? { texto: nombreDestacado, valor: valores[destacado] } : null;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={resumen}
      accessibilityHint={maximo > 0 ? "Desliza arriba o abajo para recorrer las barras." : undefined}
      accessibilityValue={elegida != null ? { text: detalle(elegida) } : undefined}
      accessibilityActions={maximo > 0 ? [{ name: "increment" }, { name: "decrement" }] : undefined}
      onAccessibilityAction={(e) => {
        const actual = elegida ?? destacado;
        if (e.nativeEvent.actionName === "increment") elegir(actual + 1);
        if (e.nativeEvent.actionName === "decrement") elegir(actual - 1);
      }}
      style={{ gap: espacio.m }}
    >
      {maximo > 0 && leyenda && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s, minHeight: 21 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colores.primario }} />
          <Texto variante="secundario" color={colores.textoSecundario} style={{ flexShrink: 1 }}>
            {leyenda.texto}
            <Texto variante="secundario" style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}>
              {"  "}
              {formatoCOP(leyenda.valor)}
            </Texto>
          </Texto>
        </View>
      )}
      <View style={{ flexDirection: "row", height: ALTO }}>
        {/* Líneas guía y barras */}
        <View style={{ flex: 1 }}>
          {[0, 0.5, 1].map((f) => (
            <View
              key={f}
              style={{ position: "absolute", left: 0, right: 0, top: (1 - f) * (ALTO - 1), height: BORDE_FINO, backgroundColor: f === 0 ? colores.bordeFuerte : colores.separador }}
            />
          ))}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end" }}>
            {valores.map((v, i) => {
              const alto = v > 0 ? Math.max(3, (v / tope) * ALTO) : 0;
              return (
                <View key={i} style={{ flex: 1, paddingHorizontal: separacion / 2, height: "100%", justifyContent: "flex-end" }}>
                  <View
                    style={{
                      height: alto,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      borderBottomLeftRadius: 1,
                      borderBottomRightRadius: 1,
                      backgroundColor: i === resaltada && v > 0 ? colores.primario : colores.interruptorApagado,
                    }}
                  />
                </View>
              );
            })}
          </View>
          {/* Capa táctil encima de las barras: tocar o deslizar elige la barra que queda bajo el dedo. Cede el gesto si la persona
              empieza a desplazar la pantalla hacia arriba o abajo. */}
          {maximo > 0 && (
            <View
              testID="barras-tactiles"
              onLayout={(e) => (ancho.current = e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => tocar(e.nativeEvent.locationX)}
              onResponderMove={(e) => tocar(e.nativeEvent.locationX)}
              onResponderTerminationRequest={() => true}
              style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
            />
          )}
        </View>
        {/* Eje de valores a la derecha, como en Salud de Apple */}
        <View style={{ width: anchoEje, marginLeft: espacio.s }}>
          {[1, 0.5, 0].map((f) => (
            <Texto
              key={f}
              variante="secundario"
              color={colores.textoSecundario}
              numberOfLines={1}
              style={{ position: "absolute", left: 0, top: (1 - f) * ALTO - 11, fontVariant: ["tabular-nums"] }}
            >
              {pesosCortos(tope * f)}
            </Texto>
          ))}
        </View>
      </View>

      {/* Etiquetas de horas, días o meses, centradas bajo su barra */}
      <View style={{ flexDirection: "row", marginRight: anchoEje + espacio.s, height: 22 }}>
        {etiquetas.map((e, i) => (
          <View key={i} style={{ flex: 1 }}>
            {(conEtiqueta(i) || i === elegida) && (
              <View style={{ position: "absolute", width: 48, left: "50%", marginLeft: -24, alignItems: "center" }}>
                <Texto variante="secundario" color={i === resaltada ? colores.texto : colores.textoSecundario} numberOfLines={1} style={{ fontWeight: i === resaltada ? "600" : "400" }}>
                  {e}
                </Texto>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
