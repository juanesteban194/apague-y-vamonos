import { router } from "expo-router";
import { Fragment } from "react";
import { View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import type { DispositivoResumen } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { EstadoConexion } from "@/components/EstadoConexion";
import { InicioAhora } from "@/components/InicioAhora";
import { InicioEsqueleto } from "@/components/InicioEsqueleto";
import { InicioHoy } from "@/components/InicioHoy";
import { InicioSubsistencia } from "@/components/InicioSubsistencia";
import { Pantalla } from "@/components/Pantalla";
import { EncabezadoSeccion, IconoEnCaja, Pastilla, Separador } from "@/components/Primitivos";
import { SelectorCasa } from "@/components/SelectorCasa";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaDispositivo } from "@/components/TarjetaDispositivo";
import { TarjetaPrepago } from "@/components/TarjetaPrepago";
import { TarjetaSemaforo } from "@/components/TarjetaSemaforo";
import { Texto } from "@/components/Texto";
import { useResumen } from "@/features/consumo/hooks";
import { usePrepago } from "@/features/prepago/hooks";
import { fechaLarga } from "@/lib/fechas";
import { useTiempoReal } from "@/realtime/estado";
import { colores, espacio } from "@/theme";

/** De mayor a menor gasto de hoy (el costo ya viene del backend); los que aún no tienen costo, al final. */
const porGasto = (a: DispositivoResumen, b: DispositivoResumen) => (b.costo_hoy_cop ?? -1) - (a.costo_hoy_cop ?? -1);

export default function Inicio() {
  const { hogar, error: errorHogar, isLoading: cargandoHogar, refetch: recargarHogar } = useHogarActual();
  const { data: resumen, error, isLoading, isFetching, refetch } = useResumen(hogar?.id);
  const conexion = useTiempoReal((t) => t.conexion);
  const { data: prepago } = usePrepago(hogar?.id);
  const mostrarPrepago = hogar?.tipo_medidor === "prepago" || (prepago && prepago.estado !== "sin_registros");

  const falla = errorHogar ?? error;
  const alRefrescar = () => (hogar ? void refetch() : void recargarHogar());

  const dispositivos = resumen ? [...resumen.dispositivos].sort(porGasto) : [];
  const mayorGasto = Math.max(0, ...dispositivos.map((d) => d.costo_hoy_cop ?? 0));
  const tarjetaPrepago = mostrarPrepago ? <TarjetaPrepago prepago={prepago} alActualizar={() => router.push("/prepago")} /> : null;
  const prepagoUrgente = prepago?.nivel === "rojo";

  return (
    <Pantalla refrescando={isFetching && !isLoading} alRefrescar={alRefrescar}>
      <View style={{ gap: 2, marginTop: espacio.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.m, minHeight: 32 }}>
          <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
            {fechaLarga(new Date())}
          </Texto>
          {hogar && <Pastilla texto={`Estrato ${hogar.estrato}`} />}
        </View>
        {hogar ? (
          <SelectorCasa />
        ) : (
          <Texto variante="tituloGrande" accessibilityRole="header">
            Inicio
          </Texto>
        )}
      </View>
      <EstadoConexion estado={conexion} />
      <SugerenciaAyuda tema="inicio" />

      {(cargandoHogar || isLoading) && !falla && <InicioEsqueleto />}
      {falla && (
        <Tarjeta style={{ padding: 20, gap: espacio.m }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
            <IconoEnCaja nombre="alertaLinea" tono="rojo" tamano={36} />
            <Texto style={{ flex: 1, fontWeight: "600" }}>{falla.message}</Texto>
          </View>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Desliza hacia abajo para reintentar.
          </Texto>
        </Tarjeta>
      )}

      {resumen && (
        <>
          <TarjetaSemaforo semaforo={resumen.semaforo} alAnotarFacturas={() => router.push("/historial")} alAnotarMedidor={() => router.push("/medidor")} />

          {prepagoUrgente && tarjetaPrepago}

          {dispositivos.length > 0 && (
            <>
              <InicioHoy resumen={resumen} />
              <InicioAhora dispositivos={dispositivos} enVivo={conexion === "conectado"} />
            </>
          )}

          <EncabezadoSeccion titulo="Qué está gastando más" detalle={dispositivos.length > 0 ? "Hoy, de mayor a menor" : undefined} />
          {dispositivos.length === 0 ? (
            <Tarjeta style={{ padding: 20, gap: espacio.m, alignItems: "flex-start" }}>
              <IconoEnCaja nombre="enchufeLinea" tamano={44} />
              <View style={{ gap: 4 }}>
                <Texto variante="subtitulo">Aún no tienes enchufes</Texto>
                <Texto color={colores.textoSecundario}>Conecta uno y aquí verás, en pesos, cuánto gasta cada dispositivo.</Texto>
              </View>
              <Boton titulo="Conectar un enchufe" variante="secundario" compacto onPress={() => router.push("/enchufe/nuevo")} />
            </Tarjeta>
          ) : (
            <Tarjeta style={{ padding: 0, gap: 0 }}>
              {dispositivos.map((d, i) => (
                <Fragment key={d.id}>
                  {i > 0 && <Separador sangria={16} />}
                  <TarjetaDispositivo
                    dispositivo={d}
                    proporcion={mayorGasto > 0 && d.costo_hoy_cop != null ? d.costo_hoy_cop / mayorGasto : undefined}
                    alPulsar={() => router.push(`/dispositivo/${d.id}`)}
                  />
                </Fragment>
              ))}
            </Tarjeta>
          )}

          <EncabezadoSeccion titulo="Tu mes" />
          {!prepagoUrgente && tarjetaPrepago}
          <InicioSubsistencia subsistencia={resumen.subsistencia} alAnotarMedidor={() => router.push("/medidor")} />
        </>
      )}
    </Pantalla>
  );
}
