import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, Pressable, View } from "react-native";

import { borrarHogar } from "@/api/cliente";
import { useHogarActual, useTarifa } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { FilaDato } from "@/components/FilaDato";
import { Icono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { elegirCasa } from "@/features/casas/seleccion";
import { mesDeTarifa } from "@/lib/fechas";
import { formatoTarifa } from "@/lib/formato";
import { colores, espacio } from "@/theme";

/** Todas las casas de la cuenta y los datos de la que estás viendo (estrato, tarifa, medidor). */
export default function Casas() {
  const cliente = useQueryClient();
  const { hogar, hogares } = useHogarActual();
  const { data: tarifa, isError: sinTarifa } = useTarifa(hogar?.id);

  function confirmarBorrado() {
    const cuantas = hogares?.length ?? 0;
    Alert.alert(
      `¿Eliminar "${hogar!.nombre}"?`,
      `Se borra todo lo de esta casa: enchufes, historial de consumo, agentes, avisos, facturas y rutinas. No se puede deshacer.${cuantas === 1 ? " Es tu única casa: tendrás que crear una nueva para seguir usando la app." : ""}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await borrarHogar(hogar!.id);
            await elegirCasa(null); // pasa a la primera casa que quede
            await cliente.invalidateQueries();
          },
        },
      ],
    );
  }

  return (
    <Pantalla>
      <SugerenciaAyuda tema="casas" />
      <View style={{ gap: espacio.s }}>
        {hogares?.map((h) => {
          const activa = h.id === hogar?.id;
          return (
            <Pressable
              key={h.id}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              onPress={() => void elegirCasa(h.id)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, padding: 14, borderRadius: 18, backgroundColor: colores.tarjeta, borderWidth: 2, borderColor: activa ? colores.primario : colores.borde }}
            >
              <Icono nombre="casa" tamano={28} />
              <View style={{ flex: 1 }}>
                <Texto style={{ fontWeight: "700" }}>{h.nombre}</Texto>
                <Texto variante="secundario" color={colores.textoSecundario}>{[h.barrio, `Estrato ${h.estrato}`].filter(Boolean).join(" · ")}</Texto>
              </View>
              {activa && <Icono nombre="ok" color={colores.verde} />}
            </Pressable>
          );
        })}
      </View>
      <Boton titulo="Agregar otra casa" variante="secundario" icono={<Icono nombre="mas" />} onPress={() => router.push("/casa/nueva")} />

      {hogar && (
        <>
          <Texto variante="subtitulo" style={{ marginTop: espacio.s }}>Datos de {hogar.nombre}</Texto>
          <Tarjeta style={{ paddingVertical: 6 }}>
            <FilaDato etiqueta="Estrato" detalle="Según tu factura de EPM" valor={String(hogar.estrato)} />
            <FilaDato
              etiqueta="Lo que te cobran"
              detalle={tarifa ? `Tarifa EPM de ${mesDeTarifa(tarifa.mes)}${tarifa.es_del_mes_actual ? "" : " (falta cargar la de este mes)"}` : sinTarifa ? "Aún no hay tarifa cargada" : "Cargando…"}
              valor={tarifa ? formatoTarifa(tarifa.cop_kwh_subsistencia) : "—"}
            />
            <FilaDato etiqueta="Tipo de medidor" detalle="Cómo te llega la energía" valor={hogar.tipo_medidor ? hogar.tipo_medidor[0].toUpperCase() + hogar.tipo_medidor.slice(1) : "Sin indicar"} ultima />
          </Tarjeta>
          <Boton titulo="Editar esta casa" variante="secundario" icono={<Icono nombre="editar" />} onPress={() => router.push("/hogar/editar")} />
          <Boton titulo="Eliminar esta casa" variante="secundario" icono={<Icono nombre="borrar" color={colores.rojo} />} onPress={confirmarBorrado} />
        </>
      )}
    </Pantalla>
  );
}
