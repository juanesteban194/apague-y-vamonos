import { router, type Href } from "expo-router";
import { Pressable, View } from "react-native";

import { Icono, type NombreIcono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

type Entrada = { titulo: string; icono: NombreIcono; ruta: Href };
type Categoria = { titulo: string; fondo: string; tinta: string; entradas: Entrada[] };

/** Las categorías de la app, como en una app de banco: cada ícono lleva a todo lo relacionado con eso. */
const CATEGORIAS: Categoria[] = [
  {
    titulo: "Mis dispositivos",
    fondo: colores.verdeFondo,
    tinta: colores.verde,
    entradas: [
      { titulo: "Enchufes", icono: "enchufe", ruta: "/enchufes" },
      { titulo: "Agentes", icono: "agente", ruta: "/agentes" },
      { titulo: "Rutinas", icono: "rutina", ruta: "/rutinas" },
    ],
  },
  {
    titulo: "Mi plata",
    fondo: colores.ambarFondo,
    tinta: colores.ambar,
    entradas: [
      { titulo: "Facturas y medidor", icono: "factura", ruta: "/facturas" },
      { titulo: "Saldo prepago", icono: "prepago", ruta: "/prepago" },
    ],
  },
  {
    titulo: "Ahorra",
    fondo: "#E6E9F2",
    tinta: "#34406B",
    entradas: [
      { titulo: "Consejos", icono: "consejo", ruta: "/consejos" },
      { titulo: "Cambiar un dispositivo", icono: "simulador", ruta: "/simulador" },
    ],
  },
  {
    titulo: "Mi cuenta",
    fondo: "#ECE8DF",
    tinta: colores.texto,
    entradas: [
      { titulo: "Mis casas", icono: "casas", ruta: "/casas" },
      { titulo: "Instrucciones", icono: "instrucciones", ruta: "/instrucciones" },
    ],
  },
];

function Atajo({ entrada, fondo, tinta }: { entrada: Entrada; fondo: string; tinta: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entrada.titulo}
      onPress={() => router.push(entrada.ruta)}
      style={{ width: 104, alignItems: "center", gap: 8 }}
    >
      <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: fondo, alignItems: "center", justifyContent: "center" }}>
        <Icono nombre={entrada.icono} tamano={30} color={tinta} />
      </View>
      <Texto variante="secundario" style={{ textAlign: "center" }}>{entrada.titulo}</Texto>
    </Pressable>
  );
}

export default function Explorar() {
  return (
    <Pantalla>
      <Texto variante="titulo" style={{ fontSize: 26, fontWeight: "800" }}>Explorar</Texto>
      {CATEGORIAS.map((c) => (
        <View key={c.titulo} style={{ gap: espacio.m, paddingBottom: espacio.l, borderBottomWidth: 1, borderBottomColor: colores.borde }}>
          <Texto variante="subtitulo">{c.titulo}</Texto>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>
            {c.entradas.map((e) => <Atajo key={e.titulo} entrada={e} fondo={c.fondo} tinta={c.tinta} />)}
          </View>
        </View>
      ))}
    </Pantalla>
  );
}
