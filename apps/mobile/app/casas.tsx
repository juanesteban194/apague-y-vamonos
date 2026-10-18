import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Fragment } from "react";
import { Alert, Pressable, View } from "react-native";

import { borrarHogar } from "@/api/cliente";
import { useHogarActual, useTarifa } from "@/api/hogar";
import { FilaDato } from "@/components/FilaDato";
import { Iniciales } from "@/components/GestionPiezas";
import { Icono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { FilaLista, Separador } from "@/components/Primitivos";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { elegirCasa } from "@/features/casas/seleccion";
import { mesDeTarifa } from "@/lib/fechas";
import { formatoTarifa } from "@/lib/formato";
import { seleccionar } from "@/lib/haptica";
import { colores, espacio } from "@/theme";

const LISTA = { padding: 0, gap: 0, overflow: "hidden" as const };
const sinFlecha = <View />; // abre una confirmación, no otra pantalla

function TituloGrupo({ children }: { children: string }) {
  return (
    <Texto variante="secundario" color={colores.textoSecundario} accessibilityRole="header" style={{ fontWeight: "600", marginLeft: 4, marginBottom: -espacio.s }}>
      {children}
    </Texto>
  );
}

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
    <Pantalla conCabecera>
      <SugerenciaAyuda tema="casas" />

      {hogar && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: espacio.s }}>
            <Iniciales nombre={hogar.nombre} tamano={64} />
            <View style={{ flex: 1, gap: 2 }}>
              <Texto variante="titulo">{hogar.nombre}</Texto>
              <Texto color={colores.textoSecundario}>{hogar.barrio || "Sin barrio"}</Texto>
            </View>
          </View>

          <TituloGrupo>{`Datos de ${hogar.nombre}`}</TituloGrupo>
          <Tarjeta style={LISTA}>
            <FilaDato etiqueta="Estrato" detalle="Según tu factura de EPM" valor={String(hogar.estrato)} />
            <FilaDato
              etiqueta="Lo que te cobran"
              detalle={tarifa ? `Tarifa EPM de ${mesDeTarifa(tarifa.mes)}${tarifa.es_del_mes_actual ? "" : " (falta cargar la de este mes)"}` : sinTarifa ? "Aún no hay tarifa cargada" : "Cargando…"}
              valor={tarifa ? formatoTarifa(tarifa.cop_kwh_subsistencia) : "—"}
            />
            <FilaDato etiqueta="Tipo de medidor" detalle="Cómo te llega la energía" valor={hogar.tipo_medidor ? hogar.tipo_medidor[0].toUpperCase() + hogar.tipo_medidor.slice(1) : "Sin indicar"} />
            <FilaLista titulo="Editar esta casa" icono="editar" etiquetaAccesible="Editar esta casa" alPulsar={() => router.push("/hogar/editar")} />
          </Tarjeta>
        </>
      )}

      <TituloGrupo>{hogares && hogares.length > 1 ? "Tus casas · toca una para verla" : "Tus casas"}</TituloGrupo>
      <Tarjeta style={LISTA}>
        {hogares?.map((h) => {
          const activa = h.id === hogar?.id;
          const detalle = [h.barrio, `Estrato ${h.estrato}`].filter(Boolean).join(" · ");
          return (
            <Fragment key={h.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${h.nombre}. ${detalle}${activa ? ". La estás viendo" : ""}`}
                accessibilityState={{ selected: activa }}
                onPress={() => {
                  if (!activa) seleccionar();
                  void elegirCasa(h.id);
                }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? "rgba(20,19,17,0.04)" : "transparent" })}
              >
                <Iniciales nombre={h.nombre} tamano={40} tono={activa ? "tinta" : "suave"} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Texto style={{ fontWeight: activa ? "600" : "500" }}>{h.nombre}</Texto>
                  <Texto variante="secundario" color={colores.textoSecundario}>
                    {detalle}
                  </Texto>
                </View>
                {activa && <Icono nombre="marca" tamano={22} color={colores.verde} />}
              </Pressable>
              <Separador sangria={70} />
            </Fragment>
          );
        })}
        <FilaLista titulo="Agregar otra casa" icono="mas" etiquetaAccesible="Agregar otra casa" alPulsar={() => router.push("/casa/nueva")} />
      </Tarjeta>

      {hogar && (
        <Tarjeta style={LISTA}>
          <FilaLista titulo="Eliminar esta casa" detalle="Borra todo lo de esta casa" icono="borrar" tonoIcono="rojo" destructiva derecha={sinFlecha} etiquetaAccesible="Eliminar esta casa" alPulsar={confirmarBorrado} />
        </Tarjeta>
      )}
    </Pantalla>
  );
}
