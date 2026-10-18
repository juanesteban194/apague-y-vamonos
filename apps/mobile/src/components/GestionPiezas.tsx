/** Piezas de las pantallas de gestión (casas, enchufes, agentes, ayuda): iniciales, punto de estado, pasos numerados, vacíos e
 *  introducciones de formulario. Se apoyan en el sistema de diseño (Primitivos, Texto, tema) para que todo se vea de la misma familia. */
import type { ReactNode } from "react";
import { View } from "react-native";

import { BORDE_FINO, colores, espacio } from "@/theme";

import type { NombreIcono } from "./Icono";
import { IconoEnCaja, type Tono } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

const PALABRAS_MENORES = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "mi", "mis"]);

/** «Casa Restrepo» → «CR», «Apartamento de mamá» → «AM», «Ana» → «AN». */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  const fuertes = palabras.filter((p) => !PALABRAS_MENORES.has(p.toLowerCase()));
  const base = fuertes.length ? fuertes : palabras;
  if (base.length === 0) return "?";
  if (base.length === 1) return base[0].slice(0, 2).toUpperCase();
  return (base[0][0] + base[base.length - 1][0]).toUpperCase();
}

const ICONOS_POR_PALABRA: [RegExp, NombreIcono][] = [
  [/nevera|refri|congelador/, "nevera"],
  [/televisor|\btv\b|tele\b/, "tv"],
  [/lavadora|secadora/, "lavadora"],
  [/ventilador/, "ventilador"],
  [/plancha/, "plancha"],
  [/microondas|horno/, "microondas"],
  [/bombillo|l[aá]mpara|\bluz\b|luces/, "bombillo"],
  [/computador|port[aá]til|pc\b/, "agenteLinea"],
  [/cargador|celular/, "cargador"],
];

/** El ícono que mejor representa lo que hay conectado al enchufe («Nevera», «Televisor de la sala»…). Si no se sabe, un enchufe. */
export function iconoDelDispositivo(...pistas: (string | null | undefined)[]): NombreIcono {
  const texto = pistas.filter(Boolean).join(" ").toLowerCase();
  return ICONOS_POR_PALABRA.find(([patron]) => patron.test(texto))?.[1] ?? "enchufeLinea";
}

/** Iniciales en un cuadrado (casas) o un círculo (personas), en tinta o en fondo suave. Decorativo: el nombre va al lado. */
export function Iniciales({ nombre, tamano = 48, forma = "cuadrada", tono = "tinta" }: { nombre: string; tamano?: number; forma?: "cuadrada" | "redonda"; tono?: "tinta" | "suave" }) {
  const tinta = tono === "tinta";
  return (
    <View
      aria-hidden
      style={{
        width: tamano,
        height: tamano,
        borderRadius: forma === "redonda" ? tamano / 2 : Math.round(tamano * 0.3),
        backgroundColor: tinta ? colores.primario : colores.tarjetaHundida,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Texto
        color={tinta ? colores.sobrePrimario : colores.texto}
        maxFontSizeMultiplier={1.2}
        style={{ fontSize: Math.max(15, Math.round(tamano * 0.36)), lineHeight: Math.max(20, Math.round(tamano * 0.46)), fontWeight: "600", letterSpacing: 0.4 }}
      >
        {iniciales(nombre)}
      </Texto>
    </View>
  );
}

/** Punto de color con anillo blanco, para ponerlo sobre la esquina de un ícono (como el «en línea» de las apps de mensajes). */
export function PuntoSobreIcono({ color, children }: { color: string; children: ReactNode }) {
  return (
    <View>
      {children}
      <View style={{ position: "absolute", right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: colores.tarjeta, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** Una línea de estado: punto de color y texto («Conectado», «Sin conexión · última vez hace 2 h»). */
export function LineaEstado({ punto, texto, color = colores.textoSecundario }: { punto: string; texto: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: punto }} />
      <Texto variante="secundario" color={color} style={{ fontWeight: "500", flexShrink: 1 }}>
        {texto}
      </Texto>
    </View>
  );
}

/** Pasos numerados con una línea fina que los une, como una línea de tiempo. Para instrucciones de 2 a 6 pasos. */
export function Pasos({ pasos }: { pasos: readonly ReactNode[] }) {
  return (
    <View accessibilityRole="list">
      {pasos.map((paso, i) => {
        const ultimo = i === pasos.length - 1;
        return (
          <View key={i} accessibilityLabel={typeof paso === "string" ? `Paso ${i + 1}: ${paso}` : undefined} style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ alignItems: "center", width: 28 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colores.tarjetaHundida, alignItems: "center", justifyContent: "center", marginTop: -2 }}>
                <Texto variante="secundario" maxFontSizeMultiplier={1.2} style={{ fontWeight: "600", lineHeight: 18, fontVariant: ["tabular-nums"] }}>
                  {i + 1}
                </Texto>
              </View>
              {!ultimo && <View style={{ flex: 1, width: BORDE_FINO * 3, backgroundColor: colores.separador, marginVertical: 4 }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: ultimo ? 0 : espacio.l }}>{typeof paso === "string" ? <Texto>{paso}</Texto> : paso}</View>
          </View>
        );
      })}
    </View>
  );
}

/** Estado vacío: ícono en caja, un título, una línea de explicación y, si hace falta, una acción debajo. */
export function Vacio({ icono, titulo, texto, tono = "neutro", children }: { icono: NombreIcono; titulo: string; texto: string; tono?: Tono; children?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", gap: espacio.s, paddingVertical: espacio.xl, paddingHorizontal: espacio.l }}>
      <IconoEnCaja nombre={icono} tono={tono} tamano={56} />
      <Texto variante="subtitulo" accessibilityRole="header" style={{ textAlign: "center", marginTop: espacio.xs }}>
        {titulo}
      </Texto>
      <Texto color={colores.textoSecundario} style={{ textAlign: "center", maxWidth: 320 }}>
        {texto}
      </Texto>
      {children && <View style={{ alignSelf: "stretch", marginTop: espacio.s }}>{children}</View>}
    </View>
  );
}

/** Cabeza de un formulario o de un paso: ícono en caja, título y una línea que dice para qué es. */
export function Introduccion({ icono, titulo, texto, tono = "neutro" }: { icono: NombreIcono; titulo: string; texto?: string; tono?: Tono }) {
  return (
    <View style={{ gap: espacio.m, marginBottom: espacio.xs }}>
      <IconoEnCaja nombre={icono} tono={tono} tamano={52} />
      <View style={{ gap: 6 }}>
        <Texto variante="titulo" accessibilityRole="header">
          {titulo}
        </Texto>
        {texto && <Texto color={colores.textoSecundario}>{texto}</Texto>}
      </View>
    </View>
  );
}

/** Sección de un formulario: un título corto encima y los campos en una tarjeta blanca (como los grupos de los Ajustes de iOS). */
export function SeccionFormulario({ titulo, nota, children }: { titulo?: string; nota?: string; children: ReactNode }) {
  return (
    <View style={{ gap: espacio.s }}>
      {titulo && (
        <Texto variante="secundario" color={colores.textoSecundario} accessibilityRole="header" style={{ fontWeight: "600", marginLeft: 4 }}>
          {titulo}
        </Texto>
      )}
      <Tarjeta style={{ padding: 16, gap: espacio.l }}>{children}</Tarjeta>
      {nota && (
        <Texto variante="secundario" color={colores.textoSecundario} style={{ marginHorizontal: 4 }}>
          {nota}
        </Texto>
      )}
    </View>
  );
}
