import type { ReactNode } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colores, espacio } from "@/theme";

type Props = { children: ReactNode; refrescando?: boolean; alRefrescar?: () => void };

export function Pantalla({ children, refrescando, alRefrescar }: Props) {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{ padding: espacio.l, gap: espacio.m }}
        refreshControl={alRefrescar ? <RefreshControl refreshing={!!refrescando} onRefresh={alRefrescar} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
