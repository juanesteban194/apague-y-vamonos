import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { colores } from "@/theme";

export default function Avisos() {
  return (
    <Pantalla>
      <Texto variante="titulo">Avisos</Texto>
      <Tarjeta>
        <Texto color={colores.textoSecundario}>Aquí aparecerán los avisos de consumos anómalos (Fase 4).</Texto>
      </Tarjeta>
    </Pantalla>
  );
}
