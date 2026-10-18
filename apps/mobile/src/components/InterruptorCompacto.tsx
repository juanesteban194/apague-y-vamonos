import { ActivityIndicator, Pressable, View } from "react-native";

import { AREA_TOQUE_MIN, colores } from "@/theme";

type Props = {
  nombre: string;
  encendido: boolean | null; // null: aún no hay datos del enchufe
  cargando?: boolean;
  alCambiar: (encender: boolean) => void;
};

/** El botón de prender y apagar de una tarjeta: un interruptor que se entiende sin leer (verde = prendido) y se toca con facilidad (≥ 44 px). */
export function InterruptorCompacto({ nombre, encendido, cargando, alCambiar }: Props) {
  const sinDatos = encendido == null;
  const prendido = encendido === true;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={sinDatos ? `${nombre}: sin datos, no se puede controlar todavía` : prendido ? `Apagar ${nombre}` : `Prender ${nombre}`}
      accessibilityState={{ checked: prendido, disabled: sinDatos || !!cargando, busy: !!cargando }}
      disabled={sinDatos || cargando}
      onPress={() => alCambiar(!prendido)}
      hitSlop={6}
      style={({ pressed }) => ({ minWidth: 72, minHeight: AREA_TOQUE_MIN + 8, alignItems: "center", justifyContent: "center", opacity: pressed || sinDatos ? 0.6 : 1 })}
    >
      <View
        style={{
          width: 64,
          height: 36,
          borderRadius: 18,
          padding: 3,
          justifyContent: "center",
          alignItems: prendido ? "flex-end" : "flex-start",
          backgroundColor: prendido ? colores.semaforoVerde : colores.interruptorApagado,
        }}
      >
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          {cargando && <ActivityIndicator size="small" color={colores.textoSecundario} />}
        </View>
      </View>
    </Pressable>
  );
}
