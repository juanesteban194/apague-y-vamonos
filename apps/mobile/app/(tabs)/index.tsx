import { router } from "expo-router";

import { BarraProgreso, colorDelNivel } from "@/components/BarraProgreso";
import { Boton } from "@/components/Boton";

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

          <Tarjeta style={{ gap: 10 }}>
            <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "700" }}>
              Línea de subsistencia
            </Texto>
            <BarraProgreso
              proporcion={resumen.subsistencia.porcentaje}
              color={colorDelNivel(resumen.subsistencia.nivel)}
              descripcion={`Lleva el ${Math.round(resumen.subsistencia.porcentaje * 100)} % de la línea de subsistencia`}
            />
            <Texto>
              {resumen.subsistencia.nivel === "rojo"
                ? "Ya pasó la línea: desde aquí la energía le sale más cara."
                : resumen.subsistencia.nivel === "amarillo"
                  ? `Ya lleva el ${Math.round(resumen.subsistencia.porcentaje * 100)} %: se acerca a la línea de subsistencia.`
                  : `Lleva el ${Math.round(resumen.subsistencia.porcentaje * 100)} % de la energía que EPM le subsidia este mes.`}
            </Texto>
            {resumen.subsistencia.fuente === "enchufes" && (
              <>
                <Texto variante="secundario" color={colores.textoSecundario}>
                  Cuenta solo lo que miden sus enchufes, no toda la casa.
                </Texto>
                <Boton titulo="Anotar lectura del medidor" variante="secundario" onPress={() => router.push("/medidor")} />
              </>
            )}
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
