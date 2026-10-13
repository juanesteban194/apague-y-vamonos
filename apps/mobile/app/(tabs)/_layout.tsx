import { Tabs } from "expo-router";

import { useHogarActual } from "@/api/hogar";
import { Icono, type NombreIcono } from "@/components/Icono";
import { useAlertas } from "@/features/alertas/hooks";
import { colores } from "@/theme";

const pestanas: { nombre: string; titulo: string; icono: NombreIcono }[] = [
  { nombre: "index", titulo: "Inicio", icono: "inicio" },
  { nombre: "explorar", titulo: "Explorar", icono: "explorar" },
  { nombre: "avisos", titulo: "Avisos", icono: "avisos" },
  { nombre: "ajustes", titulo: "Ajustes", icono: "ajustes" },
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
            tabBarIcon: ({ color }) => <Icono nombre={p.icono} tamano={26} color={String(color)} />,
            tabBarBadge: p.nombre === "avisos" && sinLeer > 0 ? sinLeer : undefined,
            tabBarBadgeStyle: { backgroundColor: colores.semaforoRojo, fontSize: 15 },
          }}
        />
      ))}
    </Tabs>
  );
}
