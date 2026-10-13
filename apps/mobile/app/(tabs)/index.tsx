import { router } from "expo-router";
import { View } from "react-native";

import { BarraProgreso, colorDelNivel } from "@/components/BarraProgreso";
import { Boton } from "@/components/Boton";

import { useHogarActual } from "@/api/hogar";
import { EstadoConexion } from "@/components/EstadoConexion";
import { Pantalla } from "@/components/Pantalla";
import { SelectorCasa } from "@/components/SelectorCasa";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaDispositivo } from "@/components/TarjetaDispositivo";
import { Texto } from "@/components/Texto";
import { TarjetaPrepago } from "@/components/TarjetaPrepago";
import { useResumen } from "@/features/consumo/hooks";
import { usePrepago } from "@/features/prepago/hooks";
import { formatoCOP } from "@/lib/formato";
import { FilaEquivalencia } from "@/components/FilaEquivalencia";
import { TarjetaSemaforo } from "@/components/TarjetaSemaforo";
import { fechaLarga, mesDeTarifa } from "@/lib/fechas";
import { useTiempoReal } from "@/realtime/estado";
import { colores } from "@/theme";

export default function Inicio() {
  const { hogar, error: errorHogar, isLoading: cargandoHogar, refetch: recargarHogar } = useHogarActual();
  const { data: resumen, error, isLoading, isFetching, refetch } = useResumen(hogar?.id);
  const conexion = useTiempoReal((t) => t.conexion);
  const { data: prepago } = usePrepago(hogar?.id);
  const mostrarPrepago = hogar?.tipo_medidor === "prepago" || (prepago && prepago.estado !== "sin_registros");

  const falla = errorHogar ?? error;
  const alRefrescar = () => (hogar ? void refetch() : void recargarHogar());

  return (
    <Pantalla refrescando={isFetching && !isLoading} alRefrescar={alRefrescar}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "600" }}>
            {fechaLarga(new Date())}
          </Texto>
          {hogar ? <SelectorCasa /> : <Texto variante="titulo" style={{ fontSize: 26, fontWeight: "800" }}>Inicio</Texto>}
        </View>
        {hogar && (
          <View style={{ backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "700" }}>
              Estrato {hogar.estrato}
            </Texto>
          </View>
        )}
      </View>
      <EstadoConexion estado={conexion} />
      <SugerenciaAyuda tema="inicio" />

      {(cargandoHogar || isLoading) && !falla && <Texto color={colores.textoSecundario}>Cargando…</Texto>}
      {falla && (
        <Tarjeta>
          <Texto color={colores.rojo} style={{ fontWeight: "600" }}>{falla.message}</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>Desliza hacia abajo para reintentar.</Texto>
        </Tarjeta>
      )}

      {resumen && (
        <>
          <TarjetaSemaforo semaforo={resumen.semaforo} alAnotarFacturas={() => router.push("/historial")} alAnotarMedidor={() => router.push("/medidor")} />

          <Tarjeta>
            <Texto variante="secundario" color={colores.textoSecundario}>Lo que han medido sus enchufes hoy</Texto>
            <Texto variante="cifra">{formatoCOP(resumen.costo_hoy_cop)}</Texto>
            {resumen.equivalencias.length > 0 && (
              <View style={{ gap: 12, marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colores.borde }}>
                {resumen.equivalencias.map((e, i) => (
                  <FilaEquivalencia key={e.texto} equivalencia={e} primera={i === 0} />
                ))}
              </View>
            )}
            <Texto color={colores.textoSecundario} style={{ marginTop: 8 }}>
              Este mes: {formatoCOP(resumen.costo_mes_cop)}
            </Texto>
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

          {mostrarPrepago && <TarjetaPrepago prepago={prepago} alActualizar={() => router.push("/prepago")} />}

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
