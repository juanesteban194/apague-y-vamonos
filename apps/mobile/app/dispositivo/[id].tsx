import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import type { Periodo } from "@/api/tipos";
import { BarrasConsumo } from "@/components/BarrasConsumo";
import { Boton } from "@/components/Boton";
import { Interruptor } from "@/components/Interruptor";
import { EstadoConexion } from "@/components/EstadoConexion";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useConsumo, useResumen } from "@/features/consumo/hooks";
import { useControlDispositivo } from "@/features/consumo/control";
import { formatoCOP, formatoPotencia } from "@/lib/formato";
import { useTiempoReal } from "@/realtime/estado";
import { colores, espacio } from "@/theme";

const PERIODOS: { valor: Periodo; titulo: string; resumen: string }[] = [
  { valor: "dia", titulo: "Día", resumen: "Hoy" },
  { valor: "semana", titulo: "Semana", resumen: "Últimos 7 días" },
  { valor: "mes", titulo: "Mes", resumen: "Este mes" },
];

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

  return (
    <Pantalla refrescando={isFetching && !isLoading} alRefrescar={() => void refetch()}>
      <Texto variante="titulo">{d?.nombre ?? "Dispositivo"}</Texto>
      <EstadoConexion estado={conexion} />

      {d && (
        <Tarjeta>
          <Texto variante="secundario" color={d.encendido ? colores.verde : colores.apagado} style={{ fontWeight: "700" }}>
            {d.encendido == null ? "Sin datos" : d.encendido ? "Encendido" : "Apagado"}
          </Texto>
          <Texto variante="cifraMedia">{d.potencia_w != null && d.encendido ? formatoPotencia(d.potencia_w) : "—"}</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>consumiendo ahora</Texto>
          {d.ultima_lectura != null && !d.en_linea && (
            <Texto variante="secundario" color={colores.ambar} style={{ fontWeight: "700" }}>Dato con retraso</Texto>
          )}
          <View style={{ flexDirection: "row", gap: espacio.xl, marginTop: espacio.s }}>
            <View>
              <Texto variante="subtitulo">{formatoCOP(d.costo_hoy_cop)}</Texto>
              <Texto variante="secundario" color={colores.textoSecundario}>hoy</Texto>
            </View>
            <View>
              <Texto variante="subtitulo">{formatoCOP(d.costo_mes_cop)}</Texto>
              <Texto variante="secundario" color={colores.textoSecundario}>este mes</Texto>
            </View>
          </View>
        </Tarjeta>
      )}

      {d && (
        <Tarjeta>
          <Interruptor encendido={d.encendido} cargando={control.enviando} alCambiar={(encender) => void control.cambiar(encender)} />
          {control.error && (
            <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "600" }}>
              {control.error}
            </Texto>
          )}
        </Tarjeta>
      )}

      <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: espacio.s }}>
        {PERIODOS.map((p) => (
          <Boton key={p.valor} flex titulo={p.titulo} variante="secundario" seleccionado={p.valor === periodo} onPress={() => setPeriodo(p.valor)} />
        ))}
      </View>

      <Tarjeta>
        {isLoading && <Texto color={colores.textoSecundario}>Cargando…</Texto>}
        {error && <Texto color={colores.rojo} style={{ fontWeight: "600" }}>{error.message}</Texto>}
        {consumo && (
          <>
            <Texto variante="secundario" color={colores.textoSecundario}>{actual.resumen}</Texto>
            <Texto variante="cifraMedia">{formatoCOP(consumo.costo_total_cop)}</Texto>
            {consumo.costo_total_cop == null && (
              <Texto variante="secundario" color={colores.ambar}>Aún no hay tarifa cargada: no se puede calcular el costo.</Texto>
            )}
            <BarrasConsumo serie={consumo.serie} periodo={periodo} />
            <Texto variante="secundario" color={colores.textoSecundario}>Costo en pesos por {periodo === "dia" ? "hora" : "día"}.</Texto>
          </>
        )}
      </Tarjeta>
    </Pantalla>
  );
}
