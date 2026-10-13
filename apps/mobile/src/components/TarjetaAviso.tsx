import { useState } from "react";
import { Pressable, View } from "react-native";

import { apagarDispositivo, ErrorApi } from "@/api/cliente";
import type { Alerta } from "@/api/tipos";
import { haceCuanto } from "@/lib/fechas";
import { colores } from "@/theme";

import { Boton } from "./Boton";
import { Texto } from "./Texto";

const COLOR_DEL_NIVEL = { rojo: colores.semaforoRojo, amarillo: colores.semaforoAmbar, verde: colores.semaforoVerde } as const;

type Props = { aviso: Alerta; alLeer: () => void; alApagado?: () => void };

/** Un aviso, como en el mockup: borde izquierdo del color del semáforo, título claro y hace cuánto pasó. */
export function TarjetaAviso({ aviso, alLeer, alApagado }: Props) {
  const [apagando, setApagando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const puedeApagar = aviso.tipo === "alto_riesgo" && !!aviso.dispositivo_id;

  async function apagar() {
    setResultado(null);
    setApagando(true);
    try {
      await apagarDispositivo(aviso.dispositivo_id!);
      setResultado({ ok: true, texto: "Listo, ya lo apagamos." });
      alApagado?.();
    } catch (e) {
      setResultado({ ok: false, texto: e instanceof ErrorApi ? e.message : "No se pudo apagar. Intenta de nuevo." });
    } finally {
      setApagando(false);
    }
  }

  const cuando = haceCuanto(aviso.fecha);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${aviso.titulo}. ${aviso.mensaje}. ${cuando}${aviso.leida ? "" : ". Sin leer"}`}
      onPress={aviso.leida ? undefined : alLeer}
      style={{
        backgroundColor: colores.tarjeta,
        borderWidth: 1,
        borderColor: colores.borde,
        borderLeftWidth: 5,
        borderLeftColor: COLOR_DEL_NIVEL[aviso.nivel],
        borderRadius: 18,
        padding: 16,
        gap: 6,
        minHeight: 44,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <Texto variante="subtitulo" style={{ flex: 1, fontWeight: "800" }}>
          {aviso.titulo}
        </Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {cuando}
        </Texto>
      </View>
      <Texto variante="secundario" color="#4A4640" style={{ lineHeight: 22 }}>
        {aviso.mensaje}
      </Texto>
      {!aviso.leida && (
        <Texto variante="secundario" color={colores.primario} style={{ fontWeight: "700" }}>
          Nuevo
        </Texto>
      )}
      {puedeApagar && (
        <View style={{ marginTop: 6, gap: 6 }}>
          <Boton titulo="Apagar ahora" onPress={apagar} cargando={apagando} />
          {resultado && (
            <Texto accessibilityRole="alert" variante="secundario" color={resultado.ok ? colores.verde : colores.rojo} style={{ fontWeight: "600" }}>
              {resultado.texto}
            </Texto>
          )}
        </View>
      )}
    </Pressable>
  );
}
