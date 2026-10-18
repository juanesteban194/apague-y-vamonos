import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, View } from "react-native";

import { useHogarActual } from "@/api/hogar";
import { useAgentes, useDispositivos } from "@/api/cuenta";
import { useResumen } from "@/features/consumo/hooks";
import { actualizarDispositivo, borrarDispositivo } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { iconoDelDispositivo, Introduccion } from "@/components/GestionPiezas";
import { Icono } from "@/components/Icono";
import { TarjetaCalibracion } from "@/components/TarjetaCalibracion";
import { FormularioEnchufe } from "@/components/FormularioEnchufe";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { aviso } from "@/lib/haptica";
import { colores, espacio } from "@/theme";

export default function EditarEnchufe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: dispositivos } = useDispositivos(hogar?.id);
  const { data: agentes } = useAgentes(hogar?.id);
  const { data: resumen } = useResumen(hogar?.id);
  const dispositivo = dispositivos?.find((d) => d.id === id);
  if (!hogar || !dispositivo) return null;
  const enVivo = resumen?.dispositivos.find((x) => x.id === dispositivo.id);
  const lecturaActualW = enVivo?.encendido ? (enVivo.potencia_w ?? null) : null; // solo cuenta si está prendido

  function confirmarBorrado() {
    aviso();
    Alert.alert(
      `¿Quitar "${dispositivo!.nombre}"?`,
      "Se borra también su historial de consumo. Esto no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Quitar",
          style: "destructive",
          onPress: async () => {
            await borrarDispositivo(hogar!.id, dispositivo!.id);
            await cliente.invalidateQueries();
            router.dismissAll();
          },
        },
      ],
    );
  }

  return (
    <PantallaFormulario centrado={false}>
      <Introduccion icono={iconoDelDispositivo(dispositivo.tipo_aparato, dispositivo.nombre)} titulo={dispositivo.nombre} texto="Cámbiale el nombre, elige qué agente lo lee y decide cuándo avisarte." />
      <FormularioEnchufe
        inicial={dispositivo}
        agentes={agentes}
        etiquetaBoton="Guardar"
        alEnviar={async ({ nombre, tipo_aparato, alto_riesgo, umbral_minutos_encendido, agente_id }) => {
          await actualizarDispositivo(hogar.id, dispositivo.id, { nombre, tipo_aparato, alto_riesgo, umbral_minutos_encendido, agente_id });
          await cliente.invalidateQueries();
          router.back();
        }}
      />
      <View style={{ marginTop: espacio.l }}>
        <TarjetaCalibracion hogarId={hogar.id} dispositivo={dispositivo} lecturaActualW={lecturaActualW} />
      </View>
      <View style={{ gap: espacio.s, marginTop: espacio.l }}>
        <Boton titulo="Quitar enchufe" variante="peligro" icono={<Icono nombre="borrar" tamano={20} color={colores.rojo} />} onPress={confirmarBorrado} />
        <Texto variante="secundario" color={colores.textoSecundario} style={{ textAlign: "center" }}>
          Quitarlo de la app no lo desempareja de Smart Life.
        </Texto>
      </View>
    </PantallaFormulario>
  );
}
