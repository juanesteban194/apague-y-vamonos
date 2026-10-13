import { router } from "expo-router";

import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useHistorial } from "@/features/consejos/hooks";
import { formatoNumero } from "@/lib/formato";
import { colores, espacio } from "@/theme";

/** Lo que se le anota a la app de EPM: el histórico de la factura (lo «normal» de la casa) y la lectura del medidor. */
export default function Facturas() {
  const { hogar } = useHogarActual();
  const { data: facturas } = useHistorial(hogar?.id);
  return (
    <Pantalla>
      <SugerenciaAyuda tema="facturas" />
      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">Mis facturas</Texto>
        <Texto color={colores.textoSecundario}>
          {facturas?.promedio_kwh != null
            ? `Tu promedio de las últimas facturas es de ${formatoNumero(facturas.promedio_kwh)} kWh al mes: contra ese número medimos cuánto ahorras.`
            : "Anota el histórico de tu factura: es lo que usamos para decirte si vas por encima o por debajo de lo normal."}
        </Texto>
        <Boton titulo={facturas?.promedio_kwh != null ? "Revisar mis facturas" : "Anotar mis facturas"} variante="secundario" onPress={() => router.push("/historial")} />
      </Tarjeta>
      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo">Medidor de EPM</Texto>
        <Texto color={colores.textoSecundario}>La lectura de tu medidor nos dice cuánto lleva este mes toda la casa, no solo los enchufes.</Texto>
        <Boton titulo="Anotar lectura del medidor" variante="secundario" onPress={() => router.push("/medidor")} />
      </Tarjeta>
    </Pantalla>
  );
}
