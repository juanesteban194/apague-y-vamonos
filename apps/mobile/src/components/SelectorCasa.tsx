import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useHogarActual } from "@/api/hogar";
import { elegirCasa } from "@/features/casas/seleccion";
import { AREA_TOQUE_MIN, colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { Icono } from "./Icono";
import { Texto } from "./Texto";

/** Nombre de la casa en grande; al tocarlo se abre la lista para cambiar de casa o agregar otra. */
export function SelectorCasa() {
  const { hogar, hogares } = useHogarActual();
  const [abierto, setAbierto] = useState(false);
  if (!hogar) return null;

  function cambiar(id: string) {
    void elegirCasa(id);
    setAbierto(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Casa: ${hogar.nombre}. Toca para cambiar de casa`}
        onPress={() => setAbierto(true)}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: AREA_TOQUE_MIN, flexShrink: 1 }}
      >
        <Icono nombre="casa" tamano={22} />
        <Texto variante="titulo" style={{ fontSize: 24, fontWeight: "800", flexShrink: 1 }} numberOfLines={1}>
          {hogar.nombre}
        </Texto>
        <Icono nombre="abajo" tamano={20} color={colores.textoSecundario} />
      </Pressable>

      <Modal visible={abierto} animationType="slide" transparent onRequestClose={() => setAbierto(false)}>
        <Pressable accessibilityLabel="Cerrar" onPress={() => setAbierto(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colores.fondo, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <View style={{ padding: espacio.l, gap: espacio.s }}>
            <Texto variante="subtitulo">¿Qué casa quieres ver?</Texto>
            {hogares?.map((h) => {
              const activa = h.id === hogar.id;
              return (
                <Pressable
                  key={h.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activa }}
                  onPress={() => cambiar(h.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, padding: 12, borderRadius: 14, backgroundColor: colores.tarjeta, borderWidth: 2, borderColor: activa ? colores.primario : colores.borde }}
                >
                  <Icono nombre="casa" tamano={24} />
                  <View style={{ flex: 1 }}>
                    <Texto style={{ fontWeight: "700" }}>{h.nombre}</Texto>
                    <Texto variante="secundario" color={colores.textoSecundario}>
                      {[h.barrio, `Estrato ${h.estrato}`].filter(Boolean).join(" · ")}
                    </Texto>
                  </View>
                  {activa && <Icono nombre="ok" color={colores.verde} />}
                </Pressable>
              );
            })}
            <Boton
              titulo="Agregar otra casa"
              variante="secundario"
              icono={<Icono nombre="mas" />}
              onPress={() => {
                setAbierto(false);
                router.push("/casa/nueva");
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
