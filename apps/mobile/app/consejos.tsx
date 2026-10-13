import { router } from "expo-router";
import { View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import type { Consejo } from "@/api/tipos";
import { Pantalla } from "@/components/Pantalla";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaConsejo } from "@/components/TarjetaConsejo";
import { Texto } from "@/components/Texto";
import { useConsejos } from "@/features/consejos/hooks";
import { colores } from "@/theme";

function irA(c: Consejo) {
  switch (c.accion) {
    case "historial":
      return router.push("/historial");
    case "medidor":
      return router.push("/medidor");
    case "enchufe":
      return router.push("/enchufe/nuevo");
    case "rutina":
      return router.push({ pathname: "/rutina/nueva", params: { dispositivo: c.dispositivo_id ?? "" } });
    case "simulador":
      return router.push({ pathname: "/simulador", params: { dispositivo: c.dispositivo_id ?? "", kwh: String(c.consumo_kwh_mes ?? "") } });
  }
}

export default function Consejos() {
  const { hogar } = useHogarActual();
  const { data: consejos, error, isLoading, isFetching, refetch } = useConsejos(hogar?.id);

  return (
    <Pantalla refrescando={isFetching && !isLoading} alRefrescar={() => void refetch()}>
      <SugerenciaAyuda tema="consejos" />
      <View>
        <Texto variante="titulo">Consejos para su casa</Texto>
        <Texto color={colores.textoSecundario}>Hechos con lo que miden sus enchufes y con su factura de EPM.</Texto>
      </View>
      {isLoading && <Texto color={colores.textoSecundario}>Cargando…</Texto>}
      {error && <Texto color={colores.rojo} style={{ fontWeight: "600" }}>{error.message}</Texto>}
      {consejos?.length === 0 && (
        <Tarjeta>
          <Texto variante="subtitulo">Todo en orden</Texto>
          <Texto color={colores.textoSecundario}>Por ahora no hay nada que mejorar. Cuando sus enchufes junten unos días de datos, aparecerán consejos aquí.</Texto>
        </Tarjeta>
      )}
      <View style={{ gap: 10 }}>
        {consejos?.map((c) => <TarjetaConsejo key={c.id} consejo={c} alActuar={irA} />)}
      </View>
    </Pantalla>
  );
}
