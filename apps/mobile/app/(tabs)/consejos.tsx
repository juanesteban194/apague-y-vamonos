import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { colores } from "@/theme";

export default function Consejos() {
  return (
    <Pantalla>
      <Texto variante="titulo">Consejos</Texto>
      <Tarjeta>
        <Texto color={colores.textoSecundario}>Aquí irán los consejos y el simulador de reemplazo RETIQ (Fase 5).</Texto>
      </Tarjeta>
    </Pantalla>
  );
}
