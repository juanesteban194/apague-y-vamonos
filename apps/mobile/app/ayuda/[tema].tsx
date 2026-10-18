import { useLocalSearchParams } from "expo-router";

import { ContenidoAyuda } from "@/components/ContenidoAyuda";
import { Vacio } from "@/components/GestionPiezas";
import { Pantalla } from "@/components/Pantalla";
import { TEMAS, type NombreTema } from "@/features/ayuda/temas";

export default function Ayuda() {
  const { tema } = useLocalSearchParams<{ tema: string }>();
  return (
    <Pantalla conCabecera>
      {tema in TEMAS ? (
        <ContenidoAyuda tema={tema as NombreTema} />
      ) : (
        <Vacio icono="ayuda" titulo="No encontramos esa ayuda." texto="Vuelve atrás y elige otro tema en Instrucciones." />
      )}
    </Pantalla>
  );
}
