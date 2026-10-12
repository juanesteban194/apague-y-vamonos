import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { cerrarSesion } from "@/api/cliente";
import { pasoDeNavegacion, useHogares, usePerfil } from "@/api/cuenta";
import { cargarSesion, useSesion } from "@/api/sesion";
import { Boton } from "@/components/Boton";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

SplashScreen.preventAutoHideAsync();

export const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

const opcionesCabecera = { headerShown: true, headerBackTitle: "Atrás", headerTitleStyle: { fontSize: 18 } } as const;

function Cargando({ error, alReintentar }: { error: Error | null; alReintentar: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo, alignItems: "center", justifyContent: "center", padding: espacio.xl, gap: espacio.l }}>
      {error ? (
        <>
          <Texto color={colores.rojo} style={{ fontWeight: "600", textAlign: "center" }}>{error.message}</Texto>
          <Boton titulo="Reintentar" onPress={alReintentar} />
          <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => void cerrarSesion()} />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colores.primario} />
          <Texto color={colores.textoSecundario}>Cargando tu cuenta…</Texto>
        </>
      )}
    </View>
  );
}

function Navegacion() {
  const cargada = useSesion((s) => s.cargada);
  const autenticado = useSesion((s) => s.refreshToken != null);
  const perfil = usePerfil(autenticado);
  const hogares = useHogares(autenticado && perfil.data?.tiene_consentimiento === true);
  const paso = pasoDeNavegacion({ autenticado, perfil: perfil.data, hogares: hogares.data });

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
  if (paso === "cargando") {
    const error = perfil.error ?? hogares.error;
    return <Cargando error={error} alReintentar={() => void (perfil.data ? hogares.refetch() : perfil.refetch())} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
      <Stack.Protected guard={paso === "sesion"}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/registro" />
      </Stack.Protected>
      <Stack.Protected guard={paso === "consentimiento"}>
        <Stack.Screen name="(onboarding)/consentimiento" />
      </Stack.Protected>
      <Stack.Protected guard={paso === "hogar"}>
        <Stack.Screen name="(onboarding)/hogar" />
      </Stack.Protected>
      <Stack.Protected guard={paso === "lista"}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dispositivo/[id]" options={{ ...opcionesCabecera, title: "Aparato", headerBackTitle: "Inicio" }} />
        <Stack.Screen name="hogar/editar" options={{ ...opcionesCabecera, title: "Mi hogar" }} />
        <Stack.Screen name="enchufe/nuevo" options={{ ...opcionesCabecera, title: "Agregar enchufe" }} />
        <Stack.Screen name="enchufe/[id]" options={{ ...opcionesCabecera, title: "Enchufe" }} />
        <Stack.Screen name="agente/nuevo" options={{ ...opcionesCabecera, title: "Agente" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RaizLayout() {
  return (
    <QueryClientProvider client={clienteConsultas}>
      <StatusBar style="dark" />
      <Navegacion />
    </QueryClientProvider>
  );
}
