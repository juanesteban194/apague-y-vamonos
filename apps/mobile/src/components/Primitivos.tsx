/** Piezas pequeñas del sistema de diseño que se repiten en todas las pantallas. Usarlas en vez de estilos sueltos mantiene la app coherente. */
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AREA_TOQUE_MIN, BORDE_FINO, colores, espacio, radios } from "@/theme";

import { Icono, type NombreIcono, type PesoIcono } from "./Icono";
import { Texto } from "./Texto";

export type Tono = "verde" | "ambar" | "rojo" | "neutro" | "tinta";

const TONOS: Record<Tono, { fondo: string; tinta: string }> = {
  verde: { fondo: colores.verdeFondo, tinta: colores.verde },
  ambar: { fondo: colores.ambarFondo, tinta: colores.ambar },
  rojo: { fondo: colores.rojoFondo, tinta: colores.rojo },
  neutro: { fondo: colores.tarjetaHundida, tinta: colores.texto },
  tinta: { fondo: colores.primario, tinta: colores.sobrePrimario },
};

export const colorDelTono = (tono: Tono) => TONOS[tono];

/** Encabezado de una sección: título a la izquierda y, si hace falta, una acción en texto a la derecha («Ver todo»). */
export function EncabezadoSeccion({ titulo, detalle, accion }: { titulo: string; detalle?: string; accion?: { texto: string; alPulsar: () => void } }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: espacio.m, marginTop: espacio.s }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="subtitulo" accessibilityRole="header">
          {titulo}
        </Texto>
        {detalle && <Texto variante="secundario" color={colores.textoSecundario}>{detalle}</Texto>}
      </View>
      {accion && (
        <Pressable accessibilityRole="button" accessibilityLabel={accion.texto} onPress={accion.alPulsar} hitSlop={8} style={{ minHeight: AREA_TOQUE_MIN, justifyContent: "flex-end" }}>
          <Texto variante="secundario" style={{ fontWeight: "600" }}>
            {accion.texto}
          </Texto>
        </Pressable>
      )}
    </View>
  );
}

/** Ícono dentro de un cuadrado redondeado con fondo de color suave (como los de Ajustes de iOS). */
/** Ícono con fondo suave. Por omisión en duotono (trazo fino con un relleno tenue): el acabado de las apps financieras. */
export function IconoEnCaja({ nombre, tono = "neutro", tamano = 40, peso = "duotone" }: { nombre: NombreIcono; tono?: Tono; tamano?: number; peso?: PesoIcono }) {
  const t = TONOS[tono];
  return (
    <View style={{ width: tamano, height: tamano, borderRadius: Math.round(tamano * 0.3), backgroundColor: t.fondo, alignItems: "center", justifyContent: "center" }}>
      <Icono nombre={nombre} tamano={Math.round(tamano * 0.52)} color={t.tinta} peso={peso} />
    </View>
  );
}

/** Pastilla de estado o de dato corto: «Ahorra unos $9.800 al mes», «Conectado». */
export function Pastilla({ texto, tono = "neutro", icono }: { texto: string; tono?: Tono; icono?: NombreIcono }) {
  const t = TONOS[tono];
  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.fondo, borderRadius: radios.total, paddingHorizontal: 12, paddingVertical: 6 }}>
      {icono && <Icono nombre={icono} tamano={16} color={t.tinta} />}
      <Texto variante="secundario" color={t.tinta} style={{ fontWeight: "600" }}>
        {texto}
      </Texto>
    </View>
  );
}

/** Línea divisoria de un pelo. `sangria` la corre a la derecha (para alinearla con el texto de una lista con íconos). */
export function Separador({ sangria = 0 }: { sangria?: number }) {
  return <View style={{ height: BORDE_FINO, backgroundColor: colores.separador, marginLeft: sangria }} />;
}

type FilaListaProps = {
  titulo: string;
  detalle?: string;
  valor?: string;
  icono?: NombreIcono;
  tonoIcono?: Tono;
  alPulsar?: () => void;
  /** Contenido a la derecha en vez de `valor` (por ejemplo un interruptor). */
  derecha?: ReactNode;
  etiquetaAccesible?: string;
  destructiva?: boolean;
};

/** Fila de una lista agrupada (dentro de una Tarjeta con padding 0): ícono, título, detalle y valor o flecha. Alto mínimo 56 px. */
export function FilaLista({ titulo, detalle, valor, icono, tonoIcono = "neutro", alPulsar, derecha, etiquetaAccesible, destructiva }: FilaListaProps) {
  const contenido = (
    <>
      {icono && <IconoEnCaja nombre={icono} tono={tonoIcono} tamano={36} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Texto color={destructiva ? colores.rojo : colores.texto} style={{ fontWeight: "500" }}>
          {titulo}
        </Texto>
        {detalle && (
          <Texto variante="secundario" color={colores.textoSecundario}>
            {detalle}
          </Texto>
        )}
      </View>
      {derecha ??
        (valor && (
          <Texto color={colores.textoSecundario} style={{ maxWidth: "45%", textAlign: "right" }}>
            {valor}
          </Texto>
        ))}
      {alPulsar && !derecha && <Icono nombre="adelante" tamano={18} color="rgba(20,19,17,0.3)" />}
    </>
  );
  const estilo = { flexDirection: "row" as const, alignItems: "center" as const, gap: 14, minHeight: 56, paddingVertical: 12, paddingHorizontal: 16 };
  if (!alPulsar) {
    return (
      <View accessible accessibilityLabel={etiquetaAccesible ?? [titulo, detalle, valor].filter(Boolean).join(". ")} style={estilo}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible ?? [titulo, detalle, valor].filter(Boolean).join(". ")}
      onPress={alPulsar}
      style={({ pressed }) => [estilo, { minHeight: 56, backgroundColor: pressed ? "rgba(20,19,17,0.04)" : "transparent" }]}
    >
      {contenido}
    </Pressable>
  );
}
