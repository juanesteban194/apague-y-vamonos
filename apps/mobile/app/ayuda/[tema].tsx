import { useLocalSearchParams } from "expo-router";

import { ContenidoAyuda } from "@/components/ContenidoAyuda";
import { Pantalla } from "@/components/Pantalla";
import { Texto } from "@/components/Texto";
import { TEMAS, type NombreTema } from "@/features/ayuda/temas";

export default function Ayuda() {
  const { tema } = useLocalSearchParams<{ tema: string }>();
  return <Pantalla>{tema in TEMAS ? <ContenidoAyuda tema={tema as NombreTema} /> : <Texto>No encontramos esa ayuda.</Texto>}</Pantalla>;
}
