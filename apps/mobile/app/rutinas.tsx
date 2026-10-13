import { router } from "expo-router";

import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { TarjetaRutina } from "@/components/TarjetaRutina";
import { Texto } from "@/components/Texto";
import { useRutinas } from "@/features/rutinas/hooks";
import { colores } from "@/theme";

export default function Rutinas() {
  const { hogar } = useHogarActual();
  const { data: rutinas } = useRutinas(hogar?.id);
  return (
    <Pantalla>
      <SugerenciaAyuda tema="rutinas" />
      {rutinas?.length === 0 && (
        <Texto color={colores.textoSecundario}>Programa que un aparato se apague solo a cierta hora, por ejemplo la plancha o el calentador.</Texto>
      )}
      {rutinas?.map((r) => <TarjetaRutina key={r.id} rutina={r} alPulsar={() => router.push(`/rutina/${r.id}`)} />)}
      <Boton titulo="Nueva rutina" variante={rutinas?.length ? "secundario" : "primario"} onPress={() => router.push("/rutina/nueva")} />
    </Pantalla>
  );
}
