import { useHogarActual, useTarifa } from "@/api/hogar";
import { cerrarSesion } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { mesDeTarifa } from "@/lib/fechas";
import { formatoTarifa } from "@/lib/formato";
import { colores } from "@/theme";

export default function MiCasa() {
  const { hogar } = useHogarActual();
  const { data: tarifa, isError } = useTarifa(hogar?.id);

  return (
    <Pantalla>
      <Texto variante="titulo">Mi casa</Texto>
      {hogar && (
        <Tarjeta>
          <Texto variante="subtitulo">{hogar.nombre}</Texto>
          <Texto color={colores.textoSecundario}>Estrato {hogar.estrato}</Texto>
        </Tarjeta>
      )}
      <Tarjeta>
        <Texto variante="subtitulo">Tarifa de energía (EPM)</Texto>
        {tarifa ? (
          <>
            <Texto color={colores.textoSecundario}>Mes de la tarifa: {mesDeTarifa(tarifa.mes)}</Texto>
            <Texto>Hasta el consumo de subsistencia: {formatoTarifa(tarifa.cop_kwh_subsistencia)}</Texto>
            <Texto>Por encima: {formatoTarifa(tarifa.cop_kwh_sobre_subsistencia)}</Texto>
            {!tarifa.es_del_mes_actual && <Texto variante="secundario" color={colores.ambar}>Falta cargar la tarifa del mes actual.</Texto>}
          </>
        ) : (
          <Texto color={isError ? colores.ambar : colores.textoSecundario}>{isError ? "Aún no hay tarifa cargada." : "Cargando…"}</Texto>
        )}
      </Tarjeta>
      <Tarjeta>
        <Texto color={colores.textoSecundario}>Prepago y rutinas de apagado llegan en la Fase 4.</Texto>
      </Tarjeta>
      <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => void cerrarSesion()} />
    </Pantalla>
  );
}
