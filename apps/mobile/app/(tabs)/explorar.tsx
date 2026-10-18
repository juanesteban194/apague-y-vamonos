import { router, type Href } from "expo-router";
import { Pressable, View } from "react-native";

import { Icono, type NombreIcono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { Separador, colorDelTono, type Tono } from "@/components/Primitivos";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

type Entrada = { titulo: string; detalle: string; icono: NombreIcono; ruta: Href };
type Categoria = { titulo: string; tono: Tono; entradas: Entrada[] };

/** Un acceso como en una app de banco: ícono en un círculo suave y el nombre debajo, sin tarjeta alrededor. */
function Acceso({ entrada, tono }: { entrada: Entrada; tono: Tono }) {
  const t = colorDelTono(tono);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entrada.titulo}
      accessibilityHint={entrada.detalle}
      onPress={() => router.push(entrada.ruta)}
      style={{ width: "33.33%", minHeight: 104, alignItems: "center", gap: 10, paddingHorizontal: 4 }}
    >
      {({ pressed }) => (
        <>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: t.fondo, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }}>
            <Icono nombre={entrada.icono} tamano={28} color={t.tinta} />
          </View>
          <Texto variante="secundario" numberOfLines={2} style={{ textAlign: "center", fontWeight: "500", color: colores.texto }}>
            {entrada.titulo}
          </Texto>
        </>
      )}
    </Pressable>
  );
}

/** Las categorías de la app, como en una app de banco: cada ícono lleva a todo lo relacionado con eso.
 *  El verde se reserva para el ahorro (igual que en el semáforo) y el ámbar para la plata. */
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
      { titulo: "Ayuda al cliente", detalle: "WhatsApp o correo", icono: "soporte", ruta: "/soporte" },
    ],
  },
];

export default function Explorar() {
  return (
    <Pantalla titulo="Explorar" subtitulo="Todo lo de tu casa, ordenado por tema.">
      <View style={{ gap: espacio.xl }}>
        {CATEGORIAS.map((c, i) => (
          <View key={c.titulo} style={{ gap: espacio.l }}>
            {i > 0 && <Separador />}
            <Texto variante="subtitulo" accessibilityRole="header">
              {c.titulo}
            </Texto>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
              {c.entradas.map((e) => (
                <Acceso key={e.titulo} entrada={e} tono={c.tono} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </Pantalla>
  );
}
