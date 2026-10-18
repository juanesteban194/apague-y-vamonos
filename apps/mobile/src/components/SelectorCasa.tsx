import { router } from "expo-router";
import { Fragment, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useHogarActual } from "@/api/hogar";
import { elegirCasa } from "@/features/casas/seleccion";
import { seleccionar } from "@/lib/haptica";
import { AREA_TOQUE_MIN, colores, espacio, radios } from "@/theme";

import { Boton } from "./Boton";
import { Icono } from "./Icono";
import { IconoEnCaja, Separador } from "./Primitivos";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** Nombre de la casa en grande; al tocarlo se abre una hoja con la lista para cambiar de casa o agregar otra. */
export function SelectorCasa() {
  const { hogar, hogares } = useHogarActual();
  const [abierto, setAbierto] = useState(false);
  if (!hogar) return null;

  function cambiar(id: string) {
    seleccionar();
    void elegirCasa(id);
    setAbierto(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Casa: ${hogar.nombre}. Toca para cambiar de casa`}
        onPress={() => setAbierto(true)}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, minHeight: AREA_TOQUE_MIN, alignSelf: "flex-start", maxWidth: "100%", opacity: pressed ? 0.6 : 1 })}
      >
        <Texto variante="tituloGrande" style={{ flexShrink: 1 }} numberOfLines={1}>
          {hogar.nombre}
        </Texto>
        <View style={{ width: 26, height: 26, borderRadius: 13, marginTop: 4, backgroundColor: colores.tarjetaHundida, alignItems: "center", justifyContent: "center" }}>
          <Icono nombre="abajo" tamano={16} color={colores.textoSecundario} />
        </View>
      </Pressable>

      <Modal visible={abierto} animationType="slide" transparent onRequestClose={() => setAbierto(false)}>
        <Pressable accessibilityLabel="Cerrar" onPress={() => setAbierto(false)} style={{ flex: 1, minHeight: AREA_TOQUE_MIN, backgroundColor: "rgba(20,19,17,0.32)" }} />
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colores.fondo, borderTopLeftRadius: radios.xl, borderTopRightRadius: radios.xl }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: espacio.l, gap: espacio.l }}>
            <View style={{ alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: "rgba(20,19,17,0.16)" }} />
            <Texto variante="subtitulo" accessibilityRole="header">
              ¿Qué casa quieres ver?
            </Texto>
            <Tarjeta style={{ padding: 0, gap: 0 }}>
              {hogares?.map((h, i) => {
                const activa = h.id === hogar.id;
                return (
                  <Fragment key={h.id}>
                    {i > 0 && <Separador sangria={66} />}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: activa }}
                      onPress={() => cambiar(h.id)}
                      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? "rgba(20,19,17,0.04)" : "transparent" })}
                    >
                      <IconoEnCaja nombre="casaLinea" tono={activa ? "tinta" : "neutro"} tamano={36} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Texto style={{ fontWeight: "600" }}>{h.nombre}</Texto>
                        <Texto variante="secundario" color={colores.textoSecundario}>
                          {[h.barrio, `Estrato ${h.estrato}`].filter(Boolean).join(" · ")}
                        </Texto>
                      </View>
                      {activa && <Icono nombre="marca" tamano={20} color={colores.texto} />}
                    </Pressable>
                  </Fragment>
                );
              })}
            </Tarjeta>
            <Boton
              titulo="Agregar otra casa"
              variante="secundario"
              icono={<Icono nombre="mas" tamano={20} />}
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
