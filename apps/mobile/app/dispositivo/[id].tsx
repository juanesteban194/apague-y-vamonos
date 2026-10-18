import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import type { Periodo } from "@/api/tipos";
import { BarrasConsumo } from "@/components/BarrasConsumo";
import { ConsumoMeses } from "@/components/ConsumoMeses";
import { ConsumoSegmentado } from "@/components/ConsumoSegmentado";
import { EstadoConexion } from "@/components/EstadoConexion";
import { Interruptor } from "@/components/Interruptor";
import { Pantalla } from "@/components/Pantalla";
import { Pastilla } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useConsumo, useResumen } from "@/features/consumo/hooks";
import { useControlDispositivo } from "@/features/consumo/control";
import { formatoCOP, formatoPotencia } from "@/lib/formato";
import { useTiempoReal } from "@/realtime/estado";
import { BORDE_FINO, colores, espacio, radios } from "@/theme";

const PERIODOS: { valor: Periodo; titulo: string; resumen: string }[] = [
  { valor: "dia", titulo: "Día", resumen: "Hoy" },
  { valor: "semana", titulo: "Semana", resumen: "Últimos 7 días" },
  { valor: "mes", titulo: "Mes", resumen: "Este mes, hasta hoy" },
];

/** Un costo con su etiqueta encima («Gastado hoy · $1.280»). */
function Costo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${valor}`} style={{ flex: 1, gap: 2 }}>
      <Texto variante="secundario" color={colores.textoSecundario}>
        {etiqueta}
      </Texto>
      <Texto variante="titulo" style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}>
        {valor}
      </Texto>
    </View>
  );
}

export default function Dispositivo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hogar } = useHogarActual();
  const { data: resumen } = useResumen(hogar?.id);
  const conexion = useTiempoReal((t) => t.conexion);
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const { data: consumo, error, isLoading, isFetching, refetch } = useConsumo(id, periodo);

  const control = useControlDispositivo(hogar?.id, id);

  const d = resumen?.dispositivos.find((x) => x.id === id);
  const actual = PERIODOS.find((p) => p.valor === periodo)!;
  const conRetraso = d != null && d.ultima_lectura != null && !d.en_linea;
  // En «mes» la serie trae los últimos 12 meses: la cifra es la del mes actual (el último punto), no la suma del año.
  const cifra = !consumo ? null : periodo === "mes" ? (consumo.serie[consumo.serie.length - 1]?.costo_cop ?? null) : consumo.costo_total_cop;

  return (
    <Pantalla refrescando={isFetching && !isLoading} alRefrescar={() => void refetch()}>
      <Texto variante="tituloGrande" accessibilityRole="header" style={{ marginTop: espacio.s }}>
        {d?.nombre ?? "Dispositivo"}
      </Texto>
      <EstadoConexion estado={conexion} />

      {d && (
        <Tarjeta style={{ padding: 20, gap: 0, borderRadius: radios.xl }}>
          {/* Estado de un vistazo y la potencia de ahora como cifra protagonista */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.s, flexWrap: "wrap" }}>
            <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
              Consumiendo ahora
            </Texto>
            <View style={{ flexDirection: "row", gap: espacio.s }}>
              {conRetraso && <Pastilla texto="Dato con retraso" tono="ambar" icono="reloj" />}
              <Pastilla texto={d.encendido == null ? "Sin datos" : d.encendido ? "Encendido" : "Apagado"} tono={d.encendido ? "verde" : "neutro"} />
            </View>
          </View>
          <Texto variante="cifra" style={{ marginTop: 2 }}>
            {d.potencia_w != null && d.encendido ? formatoPotencia(d.potencia_w) : "—"}
          </Texto>
          <View style={{ height: BORDE_FINO, backgroundColor: colores.separador, marginVertical: espacio.l }} />
          <View style={{ flexDirection: "row", gap: espacio.l }}>
            <Costo etiqueta="Gastado hoy" valor={formatoCOP(d.costo_hoy_cop)} />
            <View style={{ width: BORDE_FINO, backgroundColor: colores.separador }} />
            <Costo etiqueta="Este mes" valor={formatoCOP(d.costo_mes_cop)} />
          </View>
        </Tarjeta>
      )}

      {d && (
        <Tarjeta style={{ paddingVertical: 10, paddingHorizontal: 16, gap: espacio.s }}>
          <Interruptor encendido={d.encendido} cargando={control.enviando} alCambiar={(encender) => void control.cambiar(encender)} />
          {control.error && (
            <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "500", paddingBottom: espacio.s }}>
              {control.error}
            </Texto>
          )}
        </Tarjeta>
      )}

      <View style={{ gap: espacio.m, marginTop: espacio.s }}>
        <Texto variante="subtitulo" accessibilityRole="header">
          Cuánto ha costado
        </Texto>
        <ConsumoSegmentado etiqueta="Periodo" opciones={PERIODOS} valor={periodo} alCambiar={setPeriodo} />
      </View>

      <Tarjeta style={{ padding: 20, gap: espacio.l }}>
        {isLoading && (
          <View accessible accessibilityLabel="Cargando el consumo" style={{ gap: espacio.m }}>
            <View style={{ width: 90, height: 16, borderRadius: 6, backgroundColor: colores.tarjetaHundida }} />
            <View style={{ width: 140, height: 30, borderRadius: 8, backgroundColor: colores.tarjetaHundida }} />
            <View style={{ height: 168, borderRadius: radios.m, backgroundColor: colores.fondoElevado }} />
          </View>
        )}
        {error && (
          <Texto color={colores.rojo} style={{ fontWeight: "500" }}>
            {error.message}
          </Texto>
        )}
        {consumo && (
          <>
            <View style={{ gap: 2 }}>
              <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
                {actual.resumen}
              </Texto>
              <Texto variante="cifraMedia">{formatoCOP(cifra)}</Texto>
              {cifra == null && (
                <Texto variante="secundario" color={colores.ambar}>
                  Aún no hay tarifa cargada: no podemos calcular el costo.
                </Texto>
              )}
            </View>
            <BarrasConsumo serie={consumo.serie} periodo={periodo} />
            <Texto variante="secundario" color={colores.textoSecundario}>
              {periodo === "mes" ? "Costo en pesos de cada mes, los últimos 12." : `Costo en pesos por ${periodo === "dia" ? "hora" : "día"}.`}
            </Texto>
            {periodo === "mes" && <ConsumoMeses serie={consumo.serie} />}
          </>
        )}
      </Tarjeta>
    </Pantalla>
  );
}
