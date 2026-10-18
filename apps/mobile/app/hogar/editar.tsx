import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { useHogarActual } from "@/api/hogar";
import { actualizarHogar } from "@/api/cliente";
import { FormularioHogar } from "@/components/FormularioHogar";
import { Introduccion } from "@/components/GestionPiezas";
import { PantallaFormulario } from "@/components/PantallaCompleta";

export default function EditarHogar() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  if (!hogar) return null;
  return (
    <PantallaFormulario centrado={false}>
      <Introduccion icono="casaLinea" titulo={hogar.nombre} texto="Si cambias el estrato, recalculamos los costos con la tarifa del nuevo estrato." />
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
