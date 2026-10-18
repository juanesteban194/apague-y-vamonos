import { useQueryClient } from "@tanstack/react-query";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { guardarPreferencias, marcarAlertaLeida, marcarAlertasLeidas } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import type { Sensibilidad } from "@/api/tipos";
import { BotonAyuda } from "@/components/BotonAyuda";
import { OpcionRadio } from "@/components/OpcionRadio";
import { Pantalla } from "@/components/Pantalla";
import { EncabezadoSeccion, IconoEnCaja, Separador } from "@/components/Primitivos";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaAviso } from "@/components/TarjetaAviso";
import { Texto } from "@/components/Texto";
import { useAlertas, usePreferenciasAlertas } from "@/features/alertas/hooks";
import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

// «¿Cada cuánto te avisamos?» del mockup
const OPCIONES: { valor: Sensibilidad; titulo: string; detalle: string }[] = [
  { valor: "pocos", titulo: "Pocas", detalle: "Solo cuando algo se sale mucho de lo normal." },
  { valor: "normal", titulo: "Normales", detalle: "Lo recomendado para tu casa." },
  { valor: "todos", titulo: "Muchas", detalle: "Te contamos todo, hasta los cambios pequeños." },
];

export default function Avisos() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: avisos, error, isLoading, isFetching, refetch } = useAlertas(hogar?.id);
  const { data: preferencias } = usePreferenciasAlertas(hogar?.id);
  const nuevos = avisos?.filter((a) => !a.leida) ?? [];
  const anteriores = avisos?.filter((a) => a.leida) ?? [];
  const sinLeer = nuevos.length;

  async function leer(id: string) {
    if (!hogar) return;
    await marcarAlertaLeida(hogar.id, id).catch(() => {});
    await cliente.invalidateQueries({ queryKey: ["alertas", hogar.id] });
  }
  async function leerTodos() {
    if (!hogar) return;
    await marcarAlertasLeidas(hogar.id).catch(() => {});
    await cliente.invalidateQueries({ queryKey: ["alertas", hogar.id] });
  }
  async function elegir(sensibilidad: Sensibilidad) {
    if (!hogar) return;
    const clave = ["preferencias-alertas", hogar.id];
    await cliente.cancelQueries({ queryKey: clave }); // una respuesta vieja en camino no debe pisar lo que la persona acaba de elegir
    cliente.setQueryData(clave, { sensibilidad }); // responde al toque; si falla, se vuelve a pedir
    await guardarPreferencias(hogar.id, sensibilidad).catch(() => cliente.invalidateQueries({ queryKey: ["preferencias-alertas", hogar.id] }));
  }

  return (
    <Pantalla
      titulo="Avisos"
      subtitulo="Te contamos cuando algo se sale de lo normal."
      accion={<BotonAyuda tema="avisos" />}
      refrescando={isFetching && !isLoading}
      alRefrescar={() => void refetch()}
    >
      <SugerenciaAyuda tema="avisos" />

      {isLoading && <Texto color={colores.textoSecundario}>Cargando tus avisos…</Texto>}
      {error && (
        <Tarjeta variante="rojo">
          <Texto color={colores.rojo} style={{ fontWeight: "500" }}>
            {error.message}
          </Texto>
        </Tarjeta>
      )}

      {avisos?.length === 0 && (
        <Tarjeta style={{ alignItems: "center", paddingVertical: espacio.xxl, paddingHorizontal: espacio.xl, gap: espacio.s }}>
          <IconoEnCaja nombre="okLinea" tono="verde" tamano={56} />
          <Texto variante="subtitulo" style={{ marginTop: espacio.s }}>
            Todo tranquilo
          </Texto>
          <Texto color={colores.textoSecundario} style={{ textAlign: "center" }}>
            No tienes avisos. Si algo se sale de lo normal, aparece aquí.
          </Texto>
        </Tarjeta>
      )}

      {sinLeer > 0 && (
        <View style={{ gap: espacio.m }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.m, marginTop: espacio.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s, flexShrink: 1 }}>
              <Texto variante="subtitulo" accessibilityRole="header">
                Sin leer
              </Texto>
              <View style={{ minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, backgroundColor: colores.primario, alignItems: "center", justifyContent: "center" }}>
                <Texto variante="secundario" color={colores.sobrePrimario} style={{ fontWeight: "600", lineHeight: 18 }} accessibilityLabel={`${sinLeer} sin leer`}>
                  {sinLeer}
                </Texto>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Marcar ${sinLeer === 1 ? "el aviso" : "todos los avisos"} como leído${sinLeer === 1 ? "" : "s"}`}
              onPress={leerTodos}
              hitSlop={8}
              style={({ pressed }) => ({ minHeight: AREA_TOQUE_MIN, justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
            >
              <Texto variante="secundario" style={{ fontWeight: "600" }}>
                {sinLeer === 1 ? "Marcar como leído" : "Marcar todos como leídos"}
              </Texto>
            </Pressable>
          </View>
          <View style={{ gap: espacio.m }}>
            {nuevos.map((a) => (
              <TarjetaAviso key={a.id} aviso={a} alLeer={() => void leer(a.id)} alApagado={() => void leer(a.id)} />
            ))}
          </View>
        </View>
      )}

      {sinLeer === 0 && anteriores.length > 0 && (
        <Tarjeta style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
          <IconoEnCaja nombre="okLinea" tono="verde" tamano={36} />
          <View style={{ flex: 1 }}>
            <Texto style={{ fontWeight: "600" }}>
              Estás al día
            </Texto>
            <Texto variante="secundario" color={colores.textoSecundario}>
              Ya leíste todos tus avisos.
            </Texto>
          </View>
        </Tarjeta>
      )}

      {anteriores.length > 0 && (
        <View style={{ gap: espacio.m }}>
          <EncabezadoSeccion titulo="Anteriores" />
          <Tarjeta style={{ padding: 0, gap: 0 }}>
            {anteriores.map((a, i) => (
              <Fragment key={a.id}>
                {i > 0 && <Separador sangria={66} />}
                <TarjetaAviso variante="fila" aviso={a} alLeer={() => void leer(a.id)} />
              </Fragment>
            ))}
          </Tarjeta>
        </View>
      )}

      <View style={{ gap: espacio.m }}>
        <EncabezadoSeccion titulo="¿Cada cuánto te avisamos?" detalle="Elige cuántos avisos quieres recibir. Los importantes te llegan siempre." />
        <Tarjeta accessibilityRole="radiogroup" style={{ padding: 0, gap: 0 }}>
          {OPCIONES.map((o, i) => (
            <Fragment key={o.valor}>
              {i > 0 && <Separador sangria={54} />}
              <OpcionRadio titulo={o.titulo} detalle={o.detalle} seleccionada={preferencias?.sensibilidad === o.valor} alElegir={() => void elegir(o.valor)} />
            </Fragment>
          ))}
        </Tarjeta>
      </View>
    </Pantalla>
  );
}
