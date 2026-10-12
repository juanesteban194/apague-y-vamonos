import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { cargarSesion, useSesion } from "@/api/sesion";
import { colores } from "@/theme";

SplashScreen.preventAutoHideAsync();

export const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

export default function RaizLayout() {
  const cargada = useSesion((s) => s.cargada);
  const autenticado = useSesion((s) => s.refreshToken != null);

  useEffect(() => {
    void cargarSesion();
  }, []);
  useEffect(() => {
    if (cargada) void SplashScreen.hideAsync();
  }, [cargada]);
  useEffect(() => {
    if (cargada && !autenticado) clienteConsultas.clear(); // al salir no queda nada del hogar anterior
  }, [cargada, autenticado]);

  if (!cargada) return null;

  return (
    <QueryClientProvider client={clienteConsultas}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
        <Stack.Protected guard={autenticado}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="dispositivo/[id]"
            options={{ headerShown: true, title: "Aparato", headerBackTitle: "Inicio", headerTitleStyle: { fontSize: 18 } }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!autenticado}>
          <Stack.Screen name="(auth)/login" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
