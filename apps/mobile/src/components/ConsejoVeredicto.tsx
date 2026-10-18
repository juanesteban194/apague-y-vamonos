import type { ReactNode } from "react";
import { View } from "react-native";

import type { SimuladorResultado } from "@/api/tipos";
import { formatoCOP, formatoNumero, formatoTarifa } from "@/lib/formato";
import { colores, espacio, radios } from "@/theme";

import { Icono, type NombreIcono } from "./Icono";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

const LINEA_SOBRE_OSCURO = "rgba(247,245,240,0.12)";

type Props = {
  resultado: SimuladorResultado;
  /** Lo que cuesta al mes el dispositivo de hoy y el nuevo (kWh × la tarifa que usó el backend); null sin tarifa. */
  costoActual: number | null;
  costoNuevo: number | null;
  anios: number;
};

/** Una barra de la comparación: etiqueta, costo al mes y su largo frente al mayor de los dos. */
function BarraCosto({ etiqueta, costo, maximo, color }: { etiqueta: string; costo: number; maximo: number; color: string }) {
  const proporcion = maximo > 0 ? Math.max(0.04, Math.min(1, costo / maximo)) : 0;
  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${formatoCOP(costo)} al mes`} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: espacio.m }}>
        <Texto variante="secundario" color={colores.sobreOscuroSecundario}>
          {etiqueta}
        </Texto>
        <Texto>
          <Texto color={colores.sobreOscuro} style={{ fontWeight: "600", fontVariant: ["tabular-nums"] }}>
            {formatoCOP(costo)}
          </Texto>
          <Texto variante="secundario" color={colores.sobreOscuroSecundario}>
            {" "}al mes
          </Texto>
        </Texto>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: LINEA_SOBRE_OSCURO, overflow: "hidden" }}>
        <View style={{ width: `${proporcion * 100}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
    </View>
  );
}

function Dato({ icono, children }: { icono: NombreIcono; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: espacio.m }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(247,245,240,0.08)", alignItems: "center", justifyContent: "center" }}>
        <Icono nombre={icono} tamano={17} color={colores.sobreOscuro} />
      </View>
      <View style={{ flex: 1, paddingTop: 5 }}>{children}</View>
    </View>
  );
}

/** El veredicto del simulador como protagonista oscura: te conviene o no, cuánto ahorrarías al mes, en cuánto se paga y el balance. */
export function ConsejoVeredicto({ resultado: r, costoActual, costoNuevo, anios }: Props) {
  const conviene = r.conviene;
  const conPesos = r.precio_kwh_usado != null && costoActual != null && costoNuevo != null;
  const ahorra = r.ahorro_cop_mes > 0;
  const maximo = Math.max(costoActual ?? 0, costoNuevo ?? 0);
  const vpn = r.vpn_cop;
  // Sin tarifa no hay con qué comparar: no se dice «no te conviene», se dice qué falta.
  const senal: { titulo: string; icono: NombreIcono; fondo: string; tinta: string } = !conPesos
    ? { titulo: "Falta la tarifa", icono: "info", fondo: "rgba(247,245,240,0.12)", tinta: colores.sobreOscuro }
    : conviene
      ? { titulo: "Sí te conviene", icono: "marca", fondo: colores.semaforoVerde, tinta: "#FFFFFF" }
      : { titulo: "No te conviene", icono: "alerta", fondo: colores.semaforoAmbar, tinta: colores.oscuro };
  // Por qué, en una frase (el backend decide: conviene si el balance descontado es positivo).
  const razon = !conPesos || !ahorra ? null : conviene ? `En ${anios} años, lo que ahorras paga la compra y sobra.` : `Ahorras, pero en ${anios} años no alcanza a pagar lo que cuesta.`;

  return (
    <Tarjeta variante="oscura" accessibilityLiveRegion="polite" style={{ borderRadius: radios.xl, padding: 22, gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: senal.fondo }}>
          <Icono nombre={senal.icono} tamano={24} color={senal.tinta} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="titulo" color={colores.sobreOscuro} accessibilityRole="header">
            {senal.titulo}
          </Texto>
          {razon && (
            <Texto variante="secundario" color={colores.sobreOscuroSecundario}>
              {razon}
            </Texto>
          )}
        </View>
      </View>

      {!conPesos ? (
        <Texto color={colores.sobreOscuroSecundario}>Aún no hay tarifa cargada para tu estrato, así que no podemos pasar el ahorro a pesos.</Texto>
      ) : (
        <>
          {ahorra ? (
            <View style={{ gap: 2 }}>
              <Texto color={colores.sobreOscuroSecundario}>Ahorrarías cerca de</Texto>
              <Texto variante="cifra" color={colores.sobreOscuro}>
                {formatoCOP(r.ahorro_cop_mes)}
                <Texto variante="subtitulo" color={colores.sobreOscuroSecundario} style={{ fontWeight: "500" }}>
                  {" "}cada mes
                </Texto>
              </Texto>
            </View>
          ) : (
            <Texto color={colores.sobreOscuro}>El nuevo no gastaría menos que el actual, así que no hay ahorro que pague la compra.</Texto>
          )}

          <View style={{ gap: 14 }}>
            <BarraCosto etiqueta="El que tienes" costo={costoActual!} maximo={maximo} color="rgba(247,245,240,0.55)" />
            <BarraCosto etiqueta="Uno nuevo" costo={costoNuevo!} maximo={maximo} color={ahorra ? colores.semaforoVerde : colores.semaforoAmbar} />
          </View>

          {ahorra && (
            <View style={{ gap: 14, paddingTop: 18, borderTopWidth: 1, borderTopColor: LINEA_SOBRE_OSCURO }}>
              {r.texto_recuperacion && (
                <Dato icono="calendario">
                  <Texto color={colores.sobreOscuroSecundario}>
                    Se paga solo en <Texto color={colores.sobreOscuro} style={{ fontWeight: "600" }}>{r.texto_recuperacion}</Texto>.
                  </Texto>
                </Dato>
              )}
              <Dato icono={vpn != null && vpn >= 0 ? "tendenciaArriba" : "tendenciaAbajo"}>
                <Texto color={colores.sobreOscuroSecundario}>
                  Contando {anios} años y descontando el valor del dinero, el balance es de {vpn != null && vpn >= 0 ? "+" : "−"}
                  {formatoCOP(Math.abs(vpn ?? 0))}
                  {vpn != null && vpn < 0 ? ": no alcanza a pagarse." : "."}
                </Texto>
              </Dato>
            </View>
          )}

          <Texto variante="secundario" color={colores.sobreOscuroSecundario}>
            Usamos tu tarifa de {formatoTarifa(r.precio_kwh_usado!)} (la más alta si pasaste la línea de subsistencia).
            {r.ahorro_kwh_mes > 0 ? ` Son ${formatoNumero(r.ahorro_kwh_mes)} kWh menos al mes.` : ""}
          </Texto>
        </>
      )}
    </Tarjeta>
  );
}
