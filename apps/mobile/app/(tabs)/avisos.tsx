import { useQueryClient } from "@tanstack/react-query";
import { View } from "react-native";

import { guardarPreferencias, marcarAlertaLeida, marcarAlertasLeidas } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import type { Sensibilidad } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { OpcionRadio } from "@/components/OpcionRadio";
import { Pantalla } from "@/components/Pantalla";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaAviso } from "@/components/TarjetaAviso";
import { Texto } from "@/components/Texto";
import { useAlertas, usePreferenciasAlertas } from "@/features/alertas/hooks";
import { colores, espacio } from "@/theme";

// Textos del mockup para "¿Cada cuánto le avisamos?"
const OPCIONES: { valor: Sensibilidad; titulo: string; detalle: string }[] = [
  { valor: "pocos", titulo: "Pocas", detalle: "Solo cuando algo se sale mucho de lo normal" },
  { valor: "normal", titulo: "Normales", detalle: "Lo recomendado para su casa" },
  { valor: "todos", titulo: "Muchas", detalle: "Cuénteme todo, hasta los cambios pequeños" },
];

export default function Avisos() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: avisos, error, isLoading, isFetching, refetch } = useAlertas(hogar?.id);
  const { data: preferencias } = usePreferenciasAlertas(hogar?.id);
  const sinLeer = avisos?.filter((a) => !a.leida).length ?? 0;

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
    <Pantalla refrescando={isFetching && !isLoading} alRefrescar={() => void refetch()}>
      <SugerenciaAyuda tema="avisos" />
      <View>
        <Texto variante="titulo">Avisos</Texto>
        <Texto color={colores.textoSecundario}>Le contamos cuando algo se sale de lo normal.</Texto>
      </View>

      {sinLeer > 0 && <Boton titulo={`Marcar ${sinLeer === 1 ? "el aviso" : "todos los avisos"} como leído${sinLeer === 1 ? "" : "s"}`} variante="secundario" onPress={leerTodos} />}

      {isLoading && <Texto color={colores.textoSecundario}>Cargando…</Texto>}
      {error && <Texto color={colores.rojo} style={{ fontWeight: "600" }}>{error.message}</Texto>}
      {avisos?.length === 0 && (
        <Tarjeta>
          <Texto variante="subtitulo">Todo tranquilo</Texto>
          <Texto color={colores.textoSecundario}>Todavía no hay avisos. Cuando algo se salga de lo normal, aparecerá aquí.</Texto>
        </Tarjeta>
      )}
      <View style={{ gap: 10 }}>
        {avisos?.map((a) => (
          <TarjetaAviso key={a.id} aviso={a} alLeer={() => void leer(a.id)} alApagado={() => void leer(a.id)} />
        ))}
      </View>

      <Tarjeta style={{ gap: espacio.m }}>
        <View>
          <Texto variante="subtitulo" style={{ fontWeight: "800" }}>¿Cada cuánto le avisamos?</Texto>
          <Texto color={colores.textoSecundario}>Puede pedir pocos avisos o que le contemos todo.</Texto>
        </View>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {OPCIONES.map((o) => (
            <OpcionRadio key={o.valor} titulo={o.titulo} detalle={o.detalle} seleccionada={preferencias?.sensibilidad === o.valor} alElegir={() => void elegir(o.valor)} />
          ))}
        </View>
      </Tarjeta>
    </Pantalla>
  );
}
