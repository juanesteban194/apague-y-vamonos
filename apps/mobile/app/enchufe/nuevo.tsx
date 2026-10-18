import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { useAgentes } from "@/api/cuenta";
import { useHogarActual } from "@/api/hogar";
import { crearDispositivo } from "@/api/cliente";
import { FormularioEnchufe } from "@/components/FormularioEnchufe";
import { Introduccion } from "@/components/GestionPiezas";
import { PantallaFormulario } from "@/components/PantallaCompleta";

export default function NuevoEnchufe() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: agentes } = useAgentes(hogar?.id);
  if (!hogar) return null;
  return (
    <PantallaFormulario centrado={false}>
      <Introduccion
        icono="enchufeLinea"
        titulo="Conecta un enchufe nuevo"
        texto="Antes, emparéjalo en la app Smart Life y ten un agente en tu casa (Explorar › Agentes)."
      />
      <FormularioEnchufe
        key={agentes?.length ?? 0} // con los agentes ya cargados se vuelve a calcular el agente propuesto
        agentes={agentes}
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
