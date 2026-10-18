import { View } from "react-native";

import type { Resumen } from "@/api/tipos";
import { mesDeTarifa } from "@/lib/fechas";
import { colores, espacio, radios } from "@/theme";

import { FilaEquivalencia } from "./FilaEquivalencia";
import { pesos } from "./InicioFormato";
import { Separador } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** La cifra protagonista de Inicio: lo que lleva gastado la casa hoy (calculado por el backend), lo del mes y qué equivale. */
export function InicioHoy({ resumen }: { resumen: Resumen }) {
  const { tarifa } = resumen;
  return (
    <Tarjeta style={{ borderRadius: radios.xl, padding: 20, gap: 0 }}>
      <Texto variante="secundario" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
        Lo que has gastado hoy
      </Texto>
      <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: espacio.s, marginTop: 2 }}>
        <Texto variante="cifra" style={{ fontSize: 48, lineHeight: 56, letterSpacing: -1.6 }}>
          {pesos(resumen.costo_hoy_cop)}
        </Texto>
        <Texto color={colores.textoSecundario}>en el día</Texto>
      </View>
      <Texto variante="secundario" color={colores.textoSecundario} style={{ marginTop: 2 }}>
        {`En el mes llevas ${pesos(resumen.costo_mes_cop)}`}
      </Texto>

      {resumen.equivalencias.length > 0 && (
        <>
          <View style={{ marginVertical: espacio.l }}>
            <Separador />
          </View>
          <View style={{ gap: espacio.m }}>
            {resumen.equivalencias.map((e, i) => (
              <FilaEquivalencia key={e.texto} equivalencia={e} primera={i === 0} />
            ))}
          </View>
        </>
      )}

      <View style={{ marginTop: espacio.l, gap: 2 }}>
        {tarifa == null ? (
          <Texto variante="secundario" color={colores.ambar} style={{ fontWeight: "500" }}>
            Aún no hay tarifa cargada: todavía no podemos calcular el costo.
          </Texto>
        ) : (
          !tarifa.es_del_mes_actual && (
            <Texto variante="secundario" color={colores.ambar} style={{ fontWeight: "500" }}>
              Con la tarifa de {mesDeTarifa(tarifa.mes)}.
            </Texto>
          )
        )}
        <Texto variante="secundario" color={colores.textoSecundario}>
          Solo cuenta lo que miden tus enchufes.
        </Texto>
      </View>
    </Tarjeta>
  );
}
