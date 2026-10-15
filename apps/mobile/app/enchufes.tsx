import { router } from "expo-router";

import { useAgentes, useDispositivos } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaEnchufe } from "@/components/TarjetaEnchufe";
import { Texto } from "@/components/Texto";
import { useResumen } from "@/features/consumo/hooks";
import { haceCuanto } from "@/lib/fechas";
import { colores } from "@/theme";

/** Los enchufes de la casa, qué agente lee cada uno y si están enviando datos. Tocar uno abre sus ajustes (nombre, agente, borrar). */
export default function Enchufes() {
  const { hogar } = useHogarActual();
  const { data: dispositivos, isLoading } = useDispositivos(hogar?.id);
  const { data: resumen } = useResumen(hogar?.id);
  const { data: agentes } = useAgentes(hogar?.id);
  const estado = (id: string) => resumen?.dispositivos.find((d) => d.id === id);
  const conectados = dispositivos?.filter((d) => estado(d.id)?.en_linea).length ?? 0;

  return (
    <Pantalla>
      <SugerenciaAyuda tema="enchufes" />
      {dispositivos && dispositivos.length > 0 && (
        <Texto color={colores.textoSecundario}>{conectados} de {dispositivos.length} enviando datos ahora</Texto>
      )}
      {isLoading && <Texto color={colores.textoSecundario}>Cargando…</Texto>}
      {dispositivos?.length === 0 && (
        <Tarjeta>
          <Texto variante="subtitulo">Aún no tienes enchufes</Texto>
          <Texto color={colores.textoSecundario}>Conecta tu primer enchufe inteligente para empezar a ver cuánto gasta cada aparato.</Texto>
        </Tarjeta>
      )}
      {dispositivos?.map((d) => {
        const r = estado(d.id);
        const punto = r?.en_linea ? colores.semaforoVerde : r?.ultima_lectura ? colores.semaforoAmbar : colores.interruptorApagado;
        const detalle = r?.en_linea ? "Conectado" : r?.ultima_lectura ? `Sin señal desde ${haceCuanto(r.ultima_lectura)}` : "Todavía no ha enviado datos";
        const agente = agentes?.find((a) => a.id === d.agente_id)?.nombre ?? null;
        return <TarjetaEnchufe key={d.id} nombre={d.nombre} estado={detalle} punto={punto} agente={agente} alPulsar={() => router.push(`/enchufe/${d.id}`)} />;
      })}
      <Boton titulo="Conectar un enchufe" variante={dispositivos?.length ? "secundario" : "primario"} onPress={() => router.push("/enchufe/nuevo")} />
    </Pantalla>
  );
}
