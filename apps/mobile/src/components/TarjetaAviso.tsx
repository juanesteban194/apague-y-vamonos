import { useState } from "react";
import { Pressable, View } from "react-native";

import { apagarDispositivo, ErrorApi } from "@/api/cliente";
import type { Alerta } from "@/api/tipos";
import { haceCuanto } from "@/lib/fechas";
import { aviso as vibrarAviso } from "@/lib/haptica";
import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { Icono, type NombreIcono } from "./Icono";
import { colorDelTono, IconoEnCaja, type Tono } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** El nivel se lee de tres formas a la vez: el color del ícono, el ícono según el tipo y una palabra (no solo el color). */
const NIVEL: Record<Alerta["nivel"], { tono: Tono; palabra: string }> = {
  rojo: { tono: "rojo", palabra: "Importante" },
  amarillo: { tono: "ambar", palabra: "Para revisar" },
  verde: { tono: "verde", palabra: "Todo bien" },
};

const ICONO_DEL_TIPO: Record<string, NombreIcono> = {
  alto_riesgo: "reloj",
  consumo_anomalo: "tendenciaArriba",
  subsistencia: "medidorLinea",
  prepago: "prepagoLinea",
};

type Props = {
  aviso: Alerta;
  alLeer: () => void;
  alApagado?: () => void;
  /** `destacada`: tarjeta propia (avisos sin leer). `fila`: fila de la lista agrupada de avisos anteriores. */
  variante?: "destacada" | "fila";
};

/** Un aviso: ícono en caja del color del nivel, la palabra del nivel, hace cuánto pasó, el título y el detalle.
 *  Los de alto riesgo traen «Apagar ahora». Tocar un aviso sin leer lo marca como leído. */
export function TarjetaAviso({ aviso, alLeer, alApagado, variante = "destacada" }: Props) {
  const [apagando, setApagando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const puedeApagar = aviso.tipo === "alto_riesgo" && !!aviso.dispositivo_id;
  const nivel = NIVEL[aviso.nivel];
  const fila = variante === "fila";

  async function apagar() {
    setResultado(null);
    setApagando(true);
    try {
      await apagarDispositivo(aviso.dispositivo_id!);
      setResultado({ ok: true, texto: "Listo, ya lo apagamos." });
      alApagado?.();
    } catch (e) {
      vibrarAviso();
      setResultado({ ok: false, texto: e instanceof ErrorApi ? e.message : "No se pudo apagar. Intenta de nuevo." });
    } finally {
      setApagando(false);
    }
  }

  const cuando = haceCuanto(aviso.fecha);
  const etiqueta = `${nivel.palabra}. ${aviso.titulo}. ${aviso.mensaje}. ${cuando}${aviso.leida ? "" : ". Sin leer"}`;
  const relleno = fila ? 16 : 18;
  const tamanoIcono = fila ? 36 : 40;

  const contenido = (
    <>
      <IconoEnCaja nombre={ICONO_DEL_TIPO[aviso.tipo] ?? "alertaLinea"} tono={nivel.tono} tamano={tamanoIcono} />
      <View style={{ flex: 1, gap: fila ? 2 : 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.s }}>
          <Texto variante="etiqueta" color={colorDelTono(nivel.tono).tinta} style={{ flexShrink: 1 }} numberOfLines={1}>
            {nivel.palabra}
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            {cuando}
          </Texto>
        </View>
        <Texto variante={fila ? "cuerpo" : "subtitulo"} style={fila ? { fontWeight: "600" } : undefined}>
          {aviso.titulo}
        </Texto>
        <Texto variante={fila ? "secundario" : "cuerpo"} color={colores.textoSecundario}>
          {aviso.mensaje}
        </Texto>
      </View>
    </>
  );

  const estiloContenido = { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 14, padding: relleno };
  const cuerpo = aviso.leida ? (
    <View accessible accessibilityLabel={etiqueta} style={estiloContenido}>
      {contenido}
    </View>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Lo marca como leído"
      onPress={alLeer}
      style={({ pressed }) => [estiloContenido, { minHeight: AREA_TOQUE_MIN, backgroundColor: pressed ? "rgba(20,19,17,0.03)" : "transparent" }]}
    >
      {contenido}
    </Pressable>
  );

  // La acción va fuera de la zona que se toca para leer: así no hay un botón dentro de otro, y queda alineada con el texto.
  const accion = puedeApagar && (
    <View style={{ paddingLeft: relleno + tamanoIcono + 14, paddingRight: relleno, paddingBottom: relleno, marginTop: -4, gap: espacio.s }}>
      <Boton
        titulo="Apagar ahora"
        variante={fila ? "secundario" : "primario"}
        compacto
        icono={<Icono nombre="apagar" tamano={18} color={fila ? colores.texto : colores.sobrePrimario} />}
        onPress={apagar}
        cargando={apagando}
      />
      {resultado && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icono nombre={resultado.ok ? "ok" : "alerta"} tamano={18} color={resultado.ok ? colores.verde : colores.rojo} />
          <Texto accessibilityRole="alert" variante="secundario" color={resultado.ok ? colores.verde : colores.rojo} style={{ fontWeight: "500", flex: 1 }}>
            {resultado.texto}
          </Texto>
        </View>
      )}
    </View>
  );

  if (fila) {
    return (
      <View>
        {cuerpo}
        {accion}
      </View>
    );
  }
  return (
    <Tarjeta style={{ padding: 0, gap: 0, overflow: "hidden" }}>
      {cuerpo}
      {accion}
    </Tarjeta>
  );
}
