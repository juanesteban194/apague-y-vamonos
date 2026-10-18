import { router, type Href } from "expo-router";
import { Pressable, View } from "react-native";

import type { NombreIcono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { IconoEnCaja, type Tono } from "@/components/Primitivos";
import { Texto } from "@/components/Texto";
import { BORDE_FINO, colores, espacio, radios, sombras } from "@/theme";

type Entrada = { titulo: string; detalle: string; icono: NombreIcono; ruta: Href };
type Categoria = { titulo: string; tono: Tono; entradas: Entrada[] };

/** Las categorías de la app, como en una app de banco: cada mosaico lleva a todo lo relacionado con eso.
 *  Íconos en tonos suaves: el verde se reserva para el ahorro (igual que en el semáforo) y el ámbar para la plata. */
const CATEGORIAS: Categoria[] = [
  {
    titulo: "Mis dispositivos",
    tono: "neutro",
    entradas: [
      { titulo: "Enchufes", detalle: "Estado y ajustes", icono: "enchufeLinea", ruta: "/enchufes" },
      { titulo: "Agentes", detalle: "Quién los lee", icono: "agenteLinea", ruta: "/agentes" },
      { titulo: "Rutinas", detalle: "Apagado automático por horario", icono: "rutinaLinea", ruta: "/rutinas" },
    ],
  },
  {
    titulo: "Mi plata",
    tono: "ambar",
    entradas: [
      { titulo: "Facturas y medidor", detalle: "Tu promedio", icono: "facturaLinea", ruta: "/facturas" },
      { titulo: "Saldo prepago", detalle: "Cuánto te alcanza", icono: "prepagoLinea", ruta: "/prepago" },
    ],
  },
  {
    titulo: "Ahorra",
    tono: "verde",
    entradas: [
      { titulo: "Consejos", detalle: "Para pagar menos", icono: "consejoLinea", ruta: "/consejos" },
      { titulo: "Cambiar un dispositivo", detalle: "¿Te conviene?", icono: "simulador", ruta: "/simulador" },
    ],
  },
  {
    titulo: "Mi cuenta",
    tono: "neutro",
    entradas: [
      { titulo: "Mis casas", detalle: "Datos y tarifa", icono: "casaLinea", ruta: "/casas" },
      { titulo: "Instrucciones", detalle: "Cómo funciona", icono: "instrucciones", ruta: "/instrucciones" },
    ],
  },
];

const superficie = { backgroundColor: colores.tarjeta, borderRadius: radios.l, borderWidth: BORDE_FINO, borderColor: colores.borde, ...sombras.suave };

/** Un mosaico: ícono, nombre y una línea que dice qué hay adentro. `ancho` ocupa toda la fila (la última de una categoría impar). */
function Mosaico({ entrada, tono, ancho }: { entrada: Entrada; tono: Tono; ancho?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entrada.titulo}
      accessibilityHint={entrada.detalle}
      onPress={() => router.push(entrada.ruta)}
      style={({ pressed }) => [
        superficie,
        ancho ? { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 14 } : { flex: 1, minHeight: 112, gap: espacio.m },
        { padding: 14 },
        pressed && { transform: [{ scale: 0.98 }], backgroundColor: colores.fondoElevado },
      ]}
    >
      <IconoEnCaja nombre={entrada.icono} tono={tono} tamano={36} />
      <View style={{ flex: ancho ? 1 : undefined, gap: 1 }}>
        <Texto style={{ fontWeight: "600" }}>{entrada.titulo}</Texto>
        <Texto variante="secundario" color={colores.textoSecundario}>
          {entrada.detalle}
        </Texto>
      </View>
    </Pressable>
  );
}

function Seccion({ categoria }: { categoria: Categoria }) {
  const { entradas } = categoria;
  const filas: Entrada[][] = [];
  for (let i = 0; i + 1 < entradas.length; i += 2) filas.push(entradas.slice(i, i + 2));
  const suelta = entradas.length % 2 === 1 ? entradas[entradas.length - 1] : null;
  return (
    <View style={{ gap: espacio.m }}>
      <Texto variante="subtitulo" accessibilityRole="header" style={{ marginLeft: 2 }}>
        {categoria.titulo}
      </Texto>
      {filas.map((fila) => (
        <View key={fila[0].titulo} style={{ flexDirection: "row", gap: espacio.m }}>
          {fila.map((e) => (
            <Mosaico key={e.titulo} entrada={e} tono={categoria.tono} />
          ))}
        </View>
      ))}
      {suelta && <Mosaico entrada={suelta} tono={categoria.tono} ancho />}
    </View>
  );
}

export default function Explorar() {
  return (
    <Pantalla titulo="Explorar" subtitulo="Todo lo de tu casa, ordenado por tema.">
      <View style={{ gap: espacio.xxl - 4 }}>
        {CATEGORIAS.map((c) => (
          <Seccion key={c.titulo} categoria={c} />
        ))}
      </View>
    </Pantalla>
  );
}
