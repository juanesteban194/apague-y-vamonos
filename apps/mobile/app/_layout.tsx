import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { cerrarSesion } from "@/api/cliente";
import { pasoDeNavegacion, useHogares, usePerfil } from "@/api/cuenta";
import { cargarSesion, useSesion } from "@/api/sesion";
import { BotonAyuda } from "@/components/BotonAyuda";
import { cargarAyudaVista } from "@/features/ayuda/estado";
import type { NombreTema } from "@/features/ayuda/temas";
import { cargarCasaSeleccionada, casaVigente, elegirCasa, useCasaSeleccionada } from "@/features/casas/seleccion";
import { ProveedorTiempoReal } from "@/realtime/ProveedorTiempoReal";
import { Boton } from "@/components/Boton";
import { Texto } from "@/components/Texto";
import { colores, espacio } from "@/theme";

SplashScreen.preventAutoHideAsync();

export const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

const opcionesCabecera = { headerShown: true, headerBackTitle: "Atrás", headerTitleStyle: { fontSize: 18 } } as const;
/** Cabecera de una sección con su botón «?». */
const conAyuda = (title: string, tema: NombreTema) => ({ ...opcionesCabecera, title, headerRight: () => <BotonAyuda tema={tema} /> });

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

  const casaElegida = useCasaSeleccionada((s) => s.id);

  useEffect(() => {
    void cargarSesion();
    void cargarCasaSeleccionada();
    void cargarAyudaVista();
  }, []);
  useEffect(() => {
    if (cargada) void SplashScreen.hideAsync();
  }, [cargada]);
  useEffect(() => {
    if (cargada && !autenticado) {
      clienteConsultas.clear(); // al salir no queda nada del hogar anterior
      void elegirCasa(null);
    }
  }, [cargada, autenticado]);

  if (!cargada) return null;
  if (paso === "cargando") {
    const error = perfil.error ?? hogares.error;
    return <Cargando error={error} alReintentar={() => void (perfil.data ? hogares.refetch() : perfil.refetch())} />;
  }

  const hogarId = paso === "lista" ? casaVigente(hogares.data, casaElegida)?.id : undefined;

  return (
    <>
      {hogarId && <ProveedorTiempoReal key={hogarId} hogarId={hogarId} />}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
        <Stack.Protected guard={paso === "sesion"}>
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/registro" />
          <Stack.Screen name="(auth)/recuperar" options={{ ...opcionesCabecera, title: "Recuperar contraseña" }} />
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
          <Stack.Screen name="enchufes" options={conAyuda("Enchufes", "enchufes")} />
          <Stack.Screen name="agentes" options={conAyuda("Agentes", "agentes")} />
          <Stack.Screen name="rutinas" options={conAyuda("Rutinas", "rutinas")} />
          <Stack.Screen name="facturas" options={conAyuda("Facturas y medidor", "facturas")} />
          <Stack.Screen name="prepago" options={conAyuda("Saldo prepago", "prepago")} />
          <Stack.Screen name="consejos" options={conAyuda("Consejos", "consejos")} />
          <Stack.Screen name="simulador" options={conAyuda("¿Cambiar el aparato?", "simulador")} />
          <Stack.Screen name="casas" options={conAyuda("Mis casas", "casas")} />
          <Stack.Screen name="casa/nueva" options={{ ...opcionesCabecera, title: "Nueva casa" }} />
          <Stack.Screen name="hogar/editar" options={{ ...opcionesCabecera, title: "Editar casa" }} />
          <Stack.Screen name="enchufe/nuevo" options={{ ...opcionesCabecera, title: "Agregar enchufe" }} />
          <Stack.Screen name="enchufe/[id]" options={{ ...opcionesCabecera, title: "Enchufe" }} />
          <Stack.Screen name="agente/nuevo" options={{ ...opcionesCabecera, title: "Vincular agente" }} />
          <Stack.Screen name="medidor" options={{ ...opcionesCabecera, title: "Medidor de EPM" }} />
          <Stack.Screen name="historial" options={{ ...opcionesCabecera, title: "Mis facturas" }} />
          <Stack.Screen name="rutina/nueva" options={{ ...opcionesCabecera, title: "Nueva rutina" }} />
          <Stack.Screen name="rutina/[id]" options={{ ...opcionesCabecera, title: "Rutina" }} />
          <Stack.Screen name="instrucciones" options={{ ...opcionesCabecera, title: "Instrucciones" }} />
          <Stack.Screen name="verificar-correo" options={{ ...opcionesCabecera, title: "Verificar correo" }} />
          <Stack.Screen name="eliminar-cuenta" options={{ ...opcionesCabecera, title: "Eliminar mi cuenta" }} />
          <Stack.Screen name="ayuda/[tema]" options={{ ...opcionesCabecera, title: "Cómo funciona" }} />
        </Stack.Protected>
        {/* SIEMPRE al final: el navegador abre la primera pantalla de la lista, y la política no tiene cómo ir a entrar ni a crear la cuenta. */}
        <Stack.Screen name="politica" options={{ ...opcionesCabecera, title: "Tus datos" }} />
      </Stack>
    </>
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
