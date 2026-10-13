import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { crearHogar } from "@/api/cliente";
import { FormularioHogar } from "@/components/FormularioHogar";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { elegirCasa } from "@/features/casas/seleccion";
import { colores } from "@/theme";

/** Otra casa de la misma cuenta (por ejemplo la de los papás o un local). Cada casa tiene sus propios enchufes, agente, facturas y avisos. */
export default function NuevaCasa() {
  const cliente = useQueryClient();
  return (
    <PantallaFormulario>
      <Texto variante="titulo">Nueva casa</Texto>
      <Texto color={colores.textoSecundario}>Cada casa tiene sus propios enchufes, facturas y avisos. El estrato define la tarifa que se aplica.</Texto>
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
