import { router } from "expo-router";
import { View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import type { Consejo } from "@/api/tipos";
import { ConsejoProtagonista } from "@/components/ConsejoProtagonista";
import { Pantalla } from "@/components/Pantalla";
import { IconoEnCaja } from "@/components/Primitivos";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaConsejo } from "@/components/TarjetaConsejo";
import { Texto } from "@/components/Texto";
import { useConsejos } from "@/features/consejos/hooks";
import { formatoCOP } from "@/lib/formato";
import { colores, espacio } from "@/theme";

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

  // Presentación: se suman los ahorros que ya calculó el backend (no se calcula ninguno nuevo).
  const conAhorro = consejos?.filter((c) => c.ahorro_cop_mes != null && c.ahorro_cop_mes > 0) ?? [];
  const ahorroTotal = conAhorro.reduce((suma, c) => suma + (c.ahorro_cop_mes ?? 0), 0);
  // El primer consejo de cambiar un dispositivo es la protagonista oscura (una por pantalla); va al final, como en el mockup.
  const protagonista = consejos?.find((c) => c.tipo === "retiq");
  const resto = consejos?.filter((c) => c !== protagonista) ?? [];

  return (
    <Pantalla conCabecera refrescando={isFetching && !isLoading} alRefrescar={() => void refetch()}>
      <SugerenciaAyuda tema="consejos" />

      {ahorroTotal > 0 ? (
        <View accessible accessibilityLabel={`Podrías ahorrar unos ${formatoCOP(ahorroTotal)} al mes`} style={{ gap: 2, marginTop: espacio.s }}>
          <Texto color={colores.textoSecundario} style={{ fontWeight: "500" }}>
            Podrías ahorrar unos
          </Texto>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Texto variante="cifra">{formatoCOP(ahorroTotal)}</Texto>
            <Texto variante="subtitulo" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
              al mes
            </Texto>
          </View>
          <Texto variante="secundario" color={colores.textoSecundario} style={{ marginTop: espacio.xs }}>
            {conAhorro.length === 1 ? "Con el consejo que trae ahorro." : `Sumando los ${conAhorro.length} consejos que traen ahorro.`} Salen de lo que miden tus enchufes y de tu factura de EPM.
          </Texto>
        </View>
      ) : (
        <View style={{ gap: 4, marginTop: espacio.s }}>
          <Texto variante="tituloGrande" accessibilityRole="header">
            Consejos para tu casa
          </Texto>
          <Texto color={colores.textoSecundario}>Hechos con lo que miden tus enchufes y con tu factura de EPM.</Texto>
        </View>
      )}

      {isLoading && <Texto color={colores.textoSecundario}>Cargando tus consejos…</Texto>}
      {error && (
        <Tarjeta variante="rojo">
          <Texto color={colores.rojo} style={{ fontWeight: "500" }}>
            {error.message}
          </Texto>
        </Tarjeta>
      )}

      {consejos?.length === 0 && (
        <Tarjeta style={{ alignItems: "center", paddingVertical: espacio.xxl, paddingHorizontal: espacio.xl, gap: espacio.s }}>
          <IconoEnCaja nombre="okLinea" tono="verde" tamano={56} />
          <Texto variante="subtitulo" style={{ marginTop: espacio.s }}>
            Todo en orden
          </Texto>
          <Texto color={colores.textoSecundario} style={{ textAlign: "center" }}>
            Por ahora no hay nada que mejorar. Cuando tus enchufes junten unos días de datos, aquí verás cómo ahorrar.
          </Texto>
        </Tarjeta>
      )}

      {resto.length > 0 && (
        <View style={{ gap: espacio.m }}>
          {resto.map((c) => (
            <TarjetaConsejo key={c.id} consejo={c} alActuar={irA} />
          ))}
        </View>
      )}

      {protagonista && <ConsejoProtagonista consejo={protagonista} alActuar={irA} />}
    </Pantalla>
  );
}
