import { useState } from "react";

import { ErrorApi } from "@/api/cliente";
import type { Dispositivo, Rutina, RutinaDatos } from "@/api/tipos";
import { leerHora, mostrarHora } from "@/lib/horarios";
import { colores } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Casilla } from "./Casilla";
import { Selector } from "./Selector";
import { SelectorDias } from "./SelectorDias";
import { Texto } from "./Texto";

type Props = { dispositivos: Dispositivo[]; inicial?: Rutina; etiquetaBoton: string; alEnviar: (datos: RutinaDatos) => Promise<void> };

/** Rutina de apagado: qué aparato, qué días, a qué hora se apaga y (opcional) a qué hora se vuelve a prender. */
export function FormularioRutina({ dispositivos, inicial, etiquetaBoton, alEnviar }: Props) {
  const [dispositivoId, setDispositivoId] = useState<string | null>(inicial?.dispositivo_id ?? (dispositivos.length === 1 ? dispositivos[0].id : null));
  const [dias, setDias] = useState<number[]>(inicial?.dias ?? [0, 1, 2, 3, 4, 5, 6]);
  const [apagado, setApagado] = useState(inicial ? mostrarHora(inicial.hora_apagado) : "");
  const [prenderDespues, setPrenderDespues] = useState(inicial ? inicial.hora_encendido != null : false);
  const [encendido, setEncendido] = useState(inicial?.hora_encendido ? mostrarHora(inicial.hora_encendido) : "");
  const [activa, setActiva] = useState(inicial?.activa ?? true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const horaApagado = leerHora(apagado);
  const horaEncendido = prenderDespues ? leerHora(encendido) : null;
  const problema =
    !dispositivoId ? "Elige el aparato."
    : dias.length === 0 ? "Elige al menos un día."
    : !horaApagado ? "Escribe la hora de apagado en formato 24 horas, por ejemplo 22:00."
    : prenderDespues && !horaEncendido ? "Escribe la hora de encendido en formato 24 horas, por ejemplo 06:00."
    : horaApagado === horaEncendido ? "La hora de encendido debe ser distinta de la de apagado."
    : null;

  async function enviar() {
    if (problema) return;
    setError(null);
    setCargando(true);
    try {
      await alEnviar({ dispositivo_id: dispositivoId!, dias, hora_apagado: horaApagado!, hora_encendido: horaEncendido, activa });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (dispositivos.length === 0) {
    return <Texto color={colores.textoSecundario}>Primero agrega un enchufe en Mi casa para poder programarlo.</Texto>;
  }
  return (
    <>
      <Selector etiqueta="Aparato" opciones={dispositivos.map((d) => ({ valor: d.id, titulo: d.nombre }))} valor={dispositivoId} alCambiar={setDispositivoId} />
      <SelectorDias dias={dias} alCambiar={setDias} />
      <Campo etiqueta="Apagar a las" placeholder="22:00" keyboardType="numbers-and-punctuation" value={apagado} onChangeText={setApagado} ayuda="Hora de 24 horas: 22:00 son las 10 de la noche." />
      <Casilla marcada={prenderDespues} alCambiar={setPrenderDespues} texto="Volver a prenderlo después" />
      {prenderDespues && <Campo etiqueta="Prender a las" placeholder="06:00" keyboardType="numbers-and-punctuation" value={encendido} onChangeText={setEncendido} ayuda="Con esta hora podemos calcular cuánto ahorra la rutina." />}
      {inicial && <Casilla marcada={activa} alCambiar={setActiva} texto="Rutina activa" />}
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      {problema && (apagado || prenderDespues) && (
        <Texto variante="secundario" color={colores.textoSecundario}>
          {problema}
        </Texto>
      )}
      <Boton titulo={etiquetaBoton} onPress={enviar} cargando={cargando} deshabilitado={!!problema} />
    </>
  );
}
