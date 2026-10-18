import { router } from "expo-router";
import { View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Icono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { IconoEnCaja } from "@/components/Primitivos";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaRutina } from "@/components/TarjetaRutina";
import { Texto } from "@/components/Texto";
import { useRutinas } from "@/features/rutinas/hooks";
import { colores, espacio, radios } from "@/theme";

export default function Rutinas() {
  const { hogar } = useHogarActual();
  const { data: rutinas } = useRutinas(hogar?.id);
  const nueva = () => router.push("/rutina/nueva");
  return (
    <Pantalla>
      <SugerenciaAyuda tema="rutinas" />
      {rutinas?.length === 0 && (
        <Tarjeta style={{ padding: 24, gap: espacio.l, borderRadius: radios.xl, alignItems: "flex-start" }}>
          <IconoEnCaja nombre="rutinaLinea" tamano={52} />
          <View style={{ gap: espacio.xs }}>
            <Texto variante="titulo">Aún no tienes rutinas</Texto>
            <Texto color={colores.textoSecundario}>Programa que un dispositivo se apague solo a cierta hora, por ejemplo la plancha o el calentador.</Texto>
          </View>
          <View style={{ alignSelf: "stretch" }}>
            <Boton titulo="Nueva rutina" onPress={nueva} />
          </View>
        </Tarjeta>
      )}
      {!!rutinas?.length && (
        <Texto color={colores.textoSecundario}>Tus dispositivos se apagan solos a la hora que elegiste, aunque no estés en casa.</Texto>
      )}
      {rutinas?.map((r) => <TarjetaRutina key={r.id} rutina={r} alPulsar={() => router.push(`/rutina/${r.id}`)} />)}
      {!!rutinas?.length && <Boton titulo="Nueva rutina" variante="secundario" icono={<Icono nombre="mas" tamano={20} />} onPress={nueva} />}
    </Pantalla>
  );
}
