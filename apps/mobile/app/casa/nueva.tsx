import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { crearHogar } from "@/api/cliente";
import { FormularioHogar } from "@/components/FormularioHogar";
import { Introduccion } from "@/components/GestionPiezas";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { elegirCasa } from "@/features/casas/seleccion";

/** Otra casa de la misma cuenta (por ejemplo la de los papás o un local). Cada casa tiene sus propios enchufes, agente, facturas y avisos. */
export default function NuevaCasa() {
  const cliente = useQueryClient();
  return (
    <PantallaFormulario centrado={false}>
      <Introduccion icono="casaLinea" titulo="Agrega una casa" texto="Cada casa tiene sus propios enchufes, facturas y avisos, y no se mezclan." />
      <FormularioHogar
        etiquetaBoton="Agregar casa"
        alEnviar={async (datos) => {
          const nueva = await crearHogar(datos);
          await cliente.invalidateQueries({ queryKey: ["hogares"] });
          await elegirCasa(nueva.id); // pasa a verla de una vez
          router.back();
        }}
      />
    </PantallaFormulario>
  );
}
