import { router } from "expo-router";
import { View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { IconoEnCaja, Pastilla } from "@/components/Primitivos";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useHistorial } from "@/features/consejos/hooks";
import { formatoCOP, formatoNumero } from "@/lib/formato";
import { colores, espacio, radios } from "@/theme";

/** Lo que se le anota a la app de EPM: el histórico de la factura (lo «normal» de la casa) y la lectura del medidor. */
export default function Facturas() {
  const { hogar } = useHogarActual();
  const { data: facturas } = useHistorial(hogar?.id);
  const promedio = facturas?.promedio_kwh;
  return (
    <Pantalla>
      <SugerenciaAyuda tema="facturas" />

      {/* Protagonista: el promedio de las facturas, contra el que se mide el ahorro */}
      <Tarjeta style={{ padding: 20, gap: espacio.m, borderRadius: radios.xl }}>
        {promedio != null ? (
          <>
            <View style={{ gap: 2 }}>
              <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
                Tu promedio de las últimas facturas
              </Texto>
              <Texto variante="cifra" accessibilityLabel={`${formatoNumero(promedio)} kWh al mes`}>
                {formatoNumero(promedio)}
                <Texto variante="subtitulo" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
                  {"  "}kWh al mes
                </Texto>
              </Texto>
            </View>
            {facturas?.promedio_cop != null && <Pastilla texto={`Unos ${formatoCOP(Math.round(facturas.promedio_cop))} por factura`} icono="facturaLinea" />}
            <Texto color={colores.textoSecundario}>Contra este número medimos cuánto ahorras cada mes.</Texto>
            <Boton titulo="Revisar mis facturas" variante="secundario" onPress={() => router.push("/historial")} />
          </>
        ) : (
          <>
            <IconoEnCaja nombre="facturaLinea" tamano={48} />
            <View style={{ gap: espacio.xs }}>
              <Texto variante="titulo">Anota tus facturas</Texto>
              <Texto color={colores.textoSecundario}>
                Copia el histórico de tu factura de EPM. Con él te decimos si este mes vas por encima o por debajo de lo normal.
              </Texto>
            </View>
            <Boton titulo="Anotar mis facturas" onPress={() => router.push("/historial")} />
          </>
        )}
      </Tarjeta>

      <Tarjeta style={{ padding: 20, gap: espacio.m }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
          <IconoEnCaja nombre="medidor" tamano={40} />
          <Texto variante="subtitulo" accessibilityRole="header" style={{ flex: 1 }}>
            Medidor de EPM
          </Texto>
        </View>
        <Texto color={colores.textoSecundario}>La lectura de tu medidor nos dice cuánto lleva este mes toda la casa, no solo los enchufes.</Texto>
        <Boton titulo="Anotar lectura del medidor" variante="secundario" onPress={() => router.push("/medidor")} />
      </Tarjeta>
    </Pantalla>
  );
}
