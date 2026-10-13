import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useHogarActual } from "@/api/hogar";
import { useAlertas } from "@/features/alertas/hooks";
import { colores } from "@/theme";

type Icono = keyof typeof Ionicons.glyphMap;

const pestanas: { nombre: string; titulo: string; icono: Icono }[] = [
  { nombre: "index", titulo: "Inicio", icono: "home" },
  { nombre: "avisos", titulo: "Avisos", icono: "notifications" },
  { nombre: "consejos", titulo: "Consejos", icono: "bulb" },
  { nombre: "mi-casa", titulo: "Mi casa", icono: "settings" },
];

export default function TabsLayout() {
  const { hogar } = useHogarActual();
  const { data: avisos } = useAlertas(hogar?.id);
  const sinLeer = avisos?.filter((a) => !a.leida).length ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSecundario,
        tabBarLabelStyle: { fontSize: 15, fontWeight: "600" }, // texto ≥ 15 px
        tabBarStyle: { height: 68, paddingTop: 6 },
        tabBarItemStyle: { minHeight: 44 },
      }}
    >
      {pestanas.map((p) => (
        <Tabs.Screen
          key={p.nombre}
          name={p.nombre}
          options={{
            title: p.titulo,
            tabBarIcon: ({ color }) => <Ionicons name={p.icono} size={26} color={color} />,
            tabBarBadge: p.nombre === "avisos" && sinLeer > 0 ? sinLeer : undefined,
            tabBarBadgeStyle: { backgroundColor: colores.semaforoRojo, fontSize: 15 },
          }}
        />
      ))}
    </Tabs>
  );
}
