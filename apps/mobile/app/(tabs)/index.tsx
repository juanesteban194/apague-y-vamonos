import { router } from "expo-router";

import { useHogarActual } from "@/api/hogar";
import { EstadoConexion } from "@/components/EstadoConexion";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaDispositivo } from "@/components/TarjetaDispositivo";
import { Texto } from "@/components/Texto";
import { useResumen } from "@/features/consumo/hooks";
import { formatoCOP } from "@/lib/formato";
import { mesDeTarifa } from "@/lib/fechas";
import { useTiempoReal } from "@/realtime/estado";
import { colores } from "@/theme";

export default function Inicio() {
  const { hogar, error: errorHogar, isLoading: cargandoHogar, refetch: recargarHogar } = useHogarActual();
  const { data: resumen, error, isLoading, isFetching, refetch } = useResumen(hogar?.id);
  const conexion = useTiempoReal((t) => t.conexion);

  const falla = errorHogar ?? error;
  const alRefrescar = () => (hogar ? void refetch() : void recargarHogar());

  return (
    <Pantalla refrescando={isFetching && !isLoading} alRefrescar={alRefrescar}>
      <Texto variante="titulo">{hogar ? hogar.nombre : "Inicio"}</Texto>
      <EstadoConexion estado={conexion} />

      {(cargandoHogar || isLoading) && !falla && <Texto color={colores.textoSecundario}>Cargando…</Texto>}
      {falla && (
        <Tarjeta>
          <Texto color={colores.rojo} style={{ fontWeight: "600" }}>{falla.message}</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>Desliza hacia abajo para reintentar.</Texto>
        </Tarjeta>
      )}

      {resumen && (
        <>
          <Tarjeta>
            <Texto variante="secundario" color={colores.textoSecundario}>Hoy llevas</Texto>
            <Texto variante="cifra">{formatoCOP(resumen.costo_hoy_cop)}</Texto>
            <Texto color={colores.textoSecundario}>Este mes: {formatoCOP(resumen.costo_mes_cop)}</Texto>
            {resumen.tarifa == null ? (
              <Texto variante="secundario" color={colores.ambar}>Aún no hay tarifa cargada: no se puede calcular el costo.</Texto>
            ) : (
              !resumen.tarifa.es_del_mes_actual && (
                <Texto variante="secundario" color={colores.ambar}>Con la tarifa de {mesDeTarifa(resumen.tarifa.mes)}.</Texto>
              )
            )}
            <Texto variante="secundario" color={colores.textoSecundario}>Solo cuenta lo que miden tus enchufes.</Texto>
          </Tarjeta>

          <Texto variante="subtitulo">Tus aparatos</Texto>
          {resumen.dispositivos.length === 0 && <Texto color={colores.textoSecundario}>Todavía no hay enchufes registrados.</Texto>}
          {resumen.dispositivos.map((d) => (
            <TarjetaDispositivo key={d.id} dispositivo={d} alPulsar={() => router.push(`/dispositivo/${d.id}`)} />
          ))}
        </>
      )}
    </Pantalla>
  );
}
