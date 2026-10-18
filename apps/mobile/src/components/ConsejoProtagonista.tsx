import { View } from "react-native";

import type { Consejo } from "@/api/tipos";
import { colores, espacio, radios } from "@/theme";

import { Boton } from "./Boton";
import { Icono } from "./Icono";
import { Tarjeta } from "./Tarjeta";
import { TEXTO_DEL_BOTON } from "./TarjetaConsejo";
import { Texto } from "./Texto";

type Props = { consejo: Consejo; alActuar: (c: Consejo) => void };

/** La protagonista oscura de Consejos (una por pantalla): «Vale la pena pensarlo», ¿te conviene cambiar un dispositivo? (RETIQ). */
export function ConsejoProtagonista({ consejo: c, alActuar }: Props) {
  return (
    <Tarjeta variante="oscura" style={{ borderRadius: radios.xl, padding: 22, gap: espacio.m }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(247,245,240,0.1)", alignItems: "center", justifyContent: "center" }}>
          <Icono nombre="simulador" tamano={20} color={colores.sobreOscuro} />
        </View>
        <Texto variante="etiqueta" color={colores.verdeSuave}>
          Vale la pena pensarlo
        </Texto>
      </View>
      <View style={{ gap: espacio.s }}>
        <Texto variante="titulo" color={colores.sobreOscuro} accessibilityRole="header">
          {c.titulo}
        </Texto>
        <Texto color={colores.sobreOscuroSecundario}>{c.mensaje}</Texto>
      </View>
      {c.accion && (
        <View style={{ marginTop: espacio.xs }}>
          <Boton titulo={TEXTO_DEL_BOTON[c.accion]} variante="secundario" onPress={() => alActuar(c)} />
        </View>
      )}
    </Tarjeta>
  );
}
