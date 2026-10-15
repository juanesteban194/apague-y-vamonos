import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";

import { useHogarActual } from "@/api/hogar";
import { useAgentes, useDispositivos } from "@/api/cuenta";
import { actualizarDispositivo, borrarDispositivo } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { FormularioEnchufe } from "@/components/FormularioEnchufe";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { colores } from "@/theme";

export default function EditarEnchufe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: dispositivos } = useDispositivos(hogar?.id);
  const { data: agentes } = useAgentes(hogar?.id);
  const dispositivo = dispositivos?.find((d) => d.id === id);
  if (!hogar || !dispositivo) return null;

  function confirmarBorrado() {
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
    <PantallaFormulario>
      <Texto variante="titulo">Editar enchufe</Texto>
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
      <Boton titulo="Quitar enchufe" variante="secundario" onPress={confirmarBorrado} />
      <Texto variante="secundario" color={colores.textoSecundario}>Quitarlo no lo desempareja de Smart Life.</Texto>
    </PantallaFormulario>
  );
}
