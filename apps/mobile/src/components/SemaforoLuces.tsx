import { View } from "react-native";

import { colores } from "@/theme";

type Nivel = "verde" | "amarillo" | "rojo";

// Luces del mockup: arriba verde, en medio amarillo, abajo rojo; la activa brilla con un halo y las otras se ven apagadas.
const LUCES: { nivel: Nivel; encendida: string; apagada: string; halo: string }[] = [
  { nivel: "verde", encendida: colores.semaforoVerde, apagada: "#2E4136", halo: "rgba(21,138,78,0.28)" },
  { nivel: "amarillo", encendida: colores.semaforoAmbar, apagada: "#4A3F1E", halo: "rgba(240,180,41,0.28)" },
  { nivel: "rojo", encendida: colores.semaforoRojo, apagada: "#40292A", halo: "rgba(198,64,44,0.28)" },
];

export function SemaforoLuces({ nivel }: { nivel: Nivel }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Semáforo en ${nivel}`} style={{ width: 62, backgroundColor: colores.texto, borderRadius: 34, padding: 9, gap: 8 }}>
      {LUCES.map((l) => (
        <View
          key={l.nivel}
          style={{
            height: 44,
            borderRadius: 22,
            backgroundColor: l.nivel === nivel ? l.encendida : l.apagada,
            borderWidth: l.nivel === nivel ? 5 : 0,
            borderColor: l.halo,
          }}
        />
      ))}
    </View>
  );
}
