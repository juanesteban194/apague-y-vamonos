import { useQueryClient } from "@tanstack/react-query";

import { cerrarSesion, crearHogar } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { FormularioHogar } from "@/components/FormularioHogar";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Texto } from "@/components/Texto";
import { colores } from "@/theme";

/** Primer uso: crear el hogar. El estrato define la tarifa que se aplica a los costos. */
export default function CrearHogar() {
  const cliente = useQueryClient();
  return (
    <PantallaFormulario>
      <Texto variante="titulo">Tu hogar</Texto>
      <Texto color={colores.textoSecundario}>Con el estrato calculamos cuánto pagas por la energía.</Texto>
      <FormularioHogar
        etiquetaBoton="Crear hogar"
        alEnviar={async (datos) => {
          await crearHogar(datos);
          await cliente.invalidateQueries({ queryKey: ["hogares"] }); // la navegación pasa sola a Inicio
        }}
      />
      <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => void cerrarSesion()} />
    </PantallaFormulario>
  );
}
