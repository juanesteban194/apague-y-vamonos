import { useQueryClient } from "@tanstack/react-query";
import { View } from "react-native";

import { cerrarSesion, crearHogar } from "@/api/cliente";
import { Boton } from "@/components/Boton";
import { CuentaEncabezado } from "@/components/CuentaPiezas";
import { FormularioHogar } from "@/components/FormularioHogar";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { exito } from "@/lib/haptica";
import { espacio } from "@/theme";

/** Primer uso: crear la casa. El estrato define la tarifa que se aplica a los costos. */
export default function CrearHogar() {
  const cliente = useQueryClient();
  return (
    <PantallaFormulario>
      <CuentaEncabezado
        icono="casaLinea"
        etiqueta="Último paso"
        titulo="Cuéntanos de tu casa"
        subtitulo="Con el estrato sabemos cuánto te cobra EPM por la energía. Puedes cambiarlo cuando quieras."
      />
      <View style={{ gap: espacio.l }}>
        <FormularioHogar
          etiquetaBoton="Crear casa"
          alEnviar={async (datos) => {
            await crearHogar(datos);
            exito();
            await cliente.invalidateQueries({ queryKey: ["hogares"] }); // la navegación pasa sola a Inicio
          }}
        />
      </View>
      <Boton titulo="Cerrar sesión" variante="texto" onPress={() => void cerrarSesion()} />
    </PantallaFormulario>
  );
}
