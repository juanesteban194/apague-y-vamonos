import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { useHogarActual } from "@/api/hogar";
import { crearDispositivo } from "@/api/cliente";
import { FormularioEnchufe } from "@/components/FormularioEnchufe";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { colores } from "@/theme";

export default function NuevoEnchufe() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  if (!hogar) return null;
  return (
    <PantallaFormulario>
      <Texto variante="titulo">Agregar enchufe</Texto>
      <Texto variante="secundario" color={colores.textoSecundario}>El enchufe debe estar emparejado en Smart Life y conectado al agente de tu casa.</Texto>
      <FormularioEnchufe
        etiquetaBoton="Agregar"
        alEnviar={async (datos) => {
          await crearDispositivo(hogar.id, datos);
          await cliente.invalidateQueries();
          router.back();
        }}
      />
    </PantallaFormulario>
  );
}
