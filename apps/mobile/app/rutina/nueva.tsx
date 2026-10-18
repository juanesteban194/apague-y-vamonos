import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";

import { crearRutina } from "@/api/cliente";
import { useDispositivos } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import { FormularioRutina } from "@/components/FormularioRutina";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { colores } from "@/theme";

export default function NuevaRutina() {
  const { dispositivo } = useLocalSearchParams<{ dispositivo?: string }>();
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: dispositivos } = useDispositivos(hogar?.id);
  if (!hogar || !dispositivos) return null;
  return (
    <PantallaFormulario>
      <Texto variante="titulo">Nueva rutina</Texto>
      <Texto color={colores.textoSecundario}>Apagamos el dispositivo solo, a la hora que usted diga, aunque no esté en casa.</Texto>
      <FormularioRutina
        dispositivos={dispositivos}
        predeterminado={dispositivo ? { dispositivoId: dispositivo, apagado: "23:00", encendido: "05:00" } : undefined}
        etiquetaBoton="Guardar rutina"
        alEnviar={async (datos) => {
          await crearRutina(hogar.id, datos);
          await cliente.invalidateQueries({ queryKey: ["rutinas", hogar.id] });
          router.back();
        }}
      />
    </PantallaFormulario>
  );
}
