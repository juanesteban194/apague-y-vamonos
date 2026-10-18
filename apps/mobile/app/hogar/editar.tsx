import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { useHogarActual } from "@/api/hogar";
import { actualizarHogar } from "@/api/cliente";
import { FormularioHogar } from "@/components/FormularioHogar";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { colores } from "@/theme";

export default function EditarHogar() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  if (!hogar) return null;
  return (
    <PantallaFormulario>
      <Texto variante="titulo">Editar casa</Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>Si cambias el estrato, los costos se recalculan con la tarifa del nuevo estrato.</Texto>
      <FormularioHogar
        inicial={hogar}
        etiquetaBoton="Guardar"
        alEnviar={async (datos) => {
          await actualizarHogar(hogar.id, datos);
          await cliente.invalidateQueries();
          router.back();
        }}
      />
    </PantallaFormulario>
  );
}
