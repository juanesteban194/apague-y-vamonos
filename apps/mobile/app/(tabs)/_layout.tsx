import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useHogarActual } from "@/api/hogar";
import { Icono, type NombreIcono } from "@/components/Icono";
import { useAlertas } from "@/features/alertas/hooks";
import { BORDE_FINO, colores, fuentes } from "@/theme";

// Elegida: ícono lleno; sin elegir: solo el contorno (como en iOS).
const pestanas: { nombre: string; titulo: string; icono: NombreIcono; linea: NombreIcono }[] = [
  { nombre: "index", titulo: "Inicio", icono: "inicio", linea: "inicioLinea" },
  { nombre: "explorar", titulo: "Explorar", icono: "explorar", linea: "explorarLinea" },
  { nombre: "avisos", titulo: "Avisos", icono: "avisos", linea: "avisosLinea" },
  { nombre: "ajustes", titulo: "Ajustes", icono: "ajustes", linea: "ajustesLinea" },
];

export default function TabsLayout() {
  const margen = useSafeAreaInsets();
  const { hogar } = useHogarActual();
  const { data: avisos } = useAlertas(hogar?.id);
  const sinLeer = avisos?.filter((a) => !a.leida).length ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSecundario,
        tabBarLabelStyle: { fontSize: 15, fontFamily: fuentes.media }, // texto ≥ 15 px
        // Alto pensado para etiquetas de 15 px (el valor por omisión las corta), más la zona segura de abajo del teléfono.
        tabBarStyle: { backgroundColor: colores.fondoElevado, borderTopWidth: BORDE_FINO, borderTopColor: colores.borde, paddingTop: 8, height: 72 + margen.bottom, paddingBottom: margen.bottom + 10 },
        tabBarItemStyle: { minHeight: 44 },
      }}
    >
      {pestanas.map((p) => (
        <Tabs.Screen
          key={p.nombre}
          name={p.nombre}
          options={{
            title: p.titulo,
            tabBarIcon: ({ color, focused }) => <Icono nombre={focused ? p.icono : p.linea} tamano={24} color={String(color)} />,
            tabBarBadge: p.nombre === "avisos" && sinLeer > 0 ? sinLeer : undefined,
            tabBarBadgeStyle: { backgroundColor: colores.semaforoRojo, fontSize: 15, fontFamily: fuentes.seminegrita },
          }}
        />
      ))}
    </Tabs>
  );
}
