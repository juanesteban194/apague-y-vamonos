import { View } from "react-native";

import { colores } from "@/theme";

type Nivel = "verde" | "amarillo" | "rojo";

/** Cada luz: el color vivo cuando está encendida, un tono apagado con un asomo de su color y el halo que la rodea al brillar.
 *  Orden del mockup: arriba verde, en medio amarillo, abajo rojo. */
const LUCES: { nivel: Nivel; encendida: string; apagada: string; halo: string }[] = [
  { nivel: "verde", encendida: colores.semaforoVerde, apagada: "#20372A", halo: "rgba(30,158,90,0.55)" },
  { nivel: "amarillo", encendida: colores.semaforoAmbar, apagada: "#3B3220", halo: "rgba(242,178,46,0.55)" },
  { nivel: "rojo", encendida: colores.semaforoRojo, apagada: "#3C2523", halo: "rgba(217,69,47,0.5)" },
];

const LUZ = 42;

/** Semáforo vertical: carcasa de tinta con un brillo de borde y luces hundidas. La encendida brilla con halo y un reflejo arriba;
 *  sin `nivel` (falta un dato) se dibuja con las tres luces en reposo, para que el semáforo siempre esté y no se invente un color. */
export function SemaforoLuces({ nivel }: { nivel: Nivel | null }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={nivel ? `Semáforo en ${nivel}` : "Semáforo apagado: falta un dato para encenderlo"}
      style={{
        width: LUZ + 18,
        paddingVertical: 10,
        paddingHorizontal: 9,
        gap: 9,
        borderRadius: (LUZ + 18) / 2,
        backgroundColor: colores.oscuro,
        boxShadow: "inset 0px 1px 0px rgba(255,255,255,0.10), inset 0px -2px 6px rgba(0,0,0,0.35), 0px 2px 4px rgba(26,23,18,0.10), 0px 10px 22px rgba(26,23,18,0.16)",
      }}
    >
      {LUCES.map((l) => {
        const activa = l.nivel === nivel;
        return (
          <View
            key={l.nivel}
            style={{
              width: LUZ,
              height: LUZ,
              borderRadius: LUZ / 2,
              backgroundColor: activa ? l.encendida : l.apagada,
              boxShadow: activa
                ? `0px 0px 22px 5px ${l.halo}, 0px 0px 6px 1px ${l.halo}, inset 0px -4px 8px rgba(0,0,0,0.16)`
                : "inset 0px 2px 5px rgba(0,0,0,0.55), 0px 1px 0px rgba(255,255,255,0.05)",
            }}
          >
            {activa && (
              // Reflejo: la luz parece una lente de vidrio y no un círculo plano.
              <View style={{ position: "absolute", top: 6, left: 10, width: 15, height: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.38)", transform: [{ rotate: "-18deg" }] }} />
            )}
          </View>
        );
      })}
    </View>
  );
}
