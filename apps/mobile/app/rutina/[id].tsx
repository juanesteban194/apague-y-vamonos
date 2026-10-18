import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";

import { actualizarRutina, borrarRutina } from "@/api/cliente";
import { useDispositivos } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { FormularioRutina } from "@/components/FormularioRutina";
import { Icono } from "@/components/Icono";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { useRutinas } from "@/features/rutinas/hooks";
import { colores } from "@/theme";

export default function EditarRutina() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: dispositivos } = useDispositivos(hogar?.id);
  const { data: rutinas } = useRutinas(hogar?.id);
  const rutina = rutinas?.find((r) => r.id === id);
  if (!hogar || !dispositivos || !rutina) return null;

  function confirmarBorrado() {
    Alert.alert("¿Borrar esta rutina?", "El dispositivo dejará de apagarse solo a esa hora.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await borrarRutina(hogar!.id, rutina!.id);
          await cliente.invalidateQueries({ queryKey: ["rutinas", hogar!.id] });
          router.back();
        },
      },
    ]);
  }

  return (
    <PantallaFormulario centrado={false}>
      <Texto variante="titulo" accessibilityRole="header">
        Editar rutina
      </Texto>
      <FormularioRutina
        dispositivos={dispositivos}
        inicial={rutina}
        etiquetaBoton="Guardar cambios"
        alEnviar={async (datos) => {
          await actualizarRutina(hogar.id, rutina.id, datos);
          await cliente.invalidateQueries({ queryKey: ["rutinas", hogar.id] });
          router.back();
        }}
      />
      <Boton titulo="Borrar rutina" variante="peligro" icono={<Icono nombre="borrar" tamano={20} color={colores.rojo} />} onPress={confirmarBorrado} />
    </PantallaFormulario>
  );
}
