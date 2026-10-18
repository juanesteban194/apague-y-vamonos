import { useState } from "react";
import { View } from "react-native";

import { ErrorApi } from "@/api/cliente";
import type { Dispositivo, Rutina, RutinaDatos } from "@/api/tipos";
import { exito } from "@/lib/haptica";
import { leerHora, mostrarHora } from "@/lib/horarios";
import { colores, espacio, fuentes } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Casilla } from "./Casilla";
import { Icono } from "./Icono";
import { IconoEnCaja, Separador } from "./Primitivos";
import { Selector } from "./Selector";
import { SelectorDias } from "./SelectorDias";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

/** Las horas se escriben grandes y con números tabulares: se leen de un vistazo. */
const ESTILO_HORA = { minHeight: 60, fontSize: 26, fontFamily: fuentes.seminegrita, letterSpacing: -0.5, fontVariant: ["tabular-nums" as const] };

type Props = {
  dispositivos: Dispositivo[];
  inicial?: Rutina;
  /** Valores de partida para una rutina nueva (p. ej. desde un consejo: apagar de 23:00 a 05:00). */
  predeterminado?: { dispositivoId?: string; apagado?: string; encendido?: string };
  etiquetaBoton: string;
  alEnviar: (datos: RutinaDatos) => Promise<void>;
};

/** Rutina de apagado: qué dispositivo, qué días, a qué hora se apaga y (opcional) a qué hora se vuelve a prender. */
export function FormularioRutina({ dispositivos, inicial, predeterminado, etiquetaBoton, alEnviar }: Props) {
  const inicialId = inicial?.dispositivo_id ?? (predeterminado?.dispositivoId && dispositivos.some((d) => d.id === predeterminado.dispositivoId) ? predeterminado.dispositivoId : undefined);
  const [dispositivoId, setDispositivoId] = useState<string | null>(inicialId ?? (dispositivos.length === 1 ? dispositivos[0].id : null));
  const [dias, setDias] = useState<number[]>(inicial?.dias ?? [0, 1, 2, 3, 4, 5, 6]);
  const [apagado, setApagado] = useState(inicial ? mostrarHora(inicial.hora_apagado) : (predeterminado?.apagado ?? ""));
  const [prenderDespues, setPrenderDespues] = useState(inicial ? inicial.hora_encendido != null : !!predeterminado?.encendido);
  const [encendido, setEncendido] = useState(inicial?.hora_encendido ? mostrarHora(inicial.hora_encendido) : (predeterminado?.encendido ?? ""));
  const [activa, setActiva] = useState(inicial?.activa ?? true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const horaApagado = leerHora(apagado);
  const horaEncendido = prenderDespues ? leerHora(encendido) : null;
  const problema =
    !dispositivoId ? "Elige el dispositivo."
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
      exito();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos guardar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (dispositivos.length === 0) {
    return (
      <Tarjeta style={{ padding: 20, gap: espacio.m }}>
        <IconoEnCaja nombre="enchufeLinea" tamano={44} />
        <Texto color={colores.textoSecundario}>Primero agrega un enchufe (Explorar › Enchufes) para poder programarlo.</Texto>
      </Tarjeta>
    );
  }
  return (
    <>
      <Tarjeta style={{ padding: 18, gap: espacio.l }}>
        <Selector etiqueta="Dispositivo" opciones={dispositivos.map((d) => ({ valor: d.id, titulo: d.nombre }))} valor={dispositivoId} alCambiar={setDispositivoId} />
      </Tarjeta>

      <Tarjeta style={{ padding: 18, gap: espacio.l }}>
        <SelectorDias dias={dias} alCambiar={setDias} />
        <Separador />
        <Campo
          etiqueta="Apagar a las"
          placeholder="22:00"
          keyboardType="numbers-and-punctuation"
          value={apagado}
          onChangeText={setApagado}
          ayuda="Hora de 24 horas: 22:00 son las 10 de la noche."
          style={ESTILO_HORA}
        />
        <Casilla marcada={prenderDespues} alCambiar={setPrenderDespues} texto="Volver a prenderlo después" />
        {prenderDespues && (
          <Campo
            etiqueta="Prender a las"
            placeholder="06:00"
            keyboardType="numbers-and-punctuation"
            value={encendido}
            onChangeText={setEncendido}
            ayuda="Con esta hora calculamos cuánto te ahorra la rutina."
            style={ESTILO_HORA}
          />
        )}
      </Tarjeta>

      {inicial && (
        <Tarjeta style={{ paddingVertical: 8, paddingHorizontal: 18 }}>
          <Casilla marcada={activa} alCambiar={setActiva} texto="Rutina activa" />
        </Tarjeta>
      )}
      {error && (
        <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "500" }}>
          {error}
        </Texto>
      )}
      {problema && (apagado || prenderDespues) && (
        <View style={{ flexDirection: "row", gap: espacio.s, alignItems: "flex-start" }}>
          <Icono nombre="infoLinea" tamano={18} color={colores.textoSecundario} />
          <Texto variante="secundario" color={colores.textoSecundario} style={{ flex: 1 }}>
            {problema}
          </Texto>
        </View>
      )}
      <Boton titulo={etiquetaBoton} onPress={enviar} cargando={cargando} deshabilitado={!!problema} />
    </>
  );
}
