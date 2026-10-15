import { useState } from "react";

import { ErrorApi } from "@/api/cliente";
import type { Agente, Dispositivo } from "@/api/tipos";
import { colores } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Casilla } from "./Casilla";
import { Selector } from "./Selector";
import { Texto } from "./Texto";

export type DatosEnchufe = {
  tuya_id: string;
  nombre: string;
  tipo_aparato: string | null;
  alto_riesgo: boolean;
  umbral_minutos_encendido: number | null;
  agente_id: string | null;
};

type Props = { inicial?: Dispositivo; agentes?: Agente[]; etiquetaBoton: string; alEnviar: (datos: DatosEnchufe) => Promise<void> };

const SIN_AGENTE = "ninguno";

/** Alta y edición de un enchufe. El ID de Tuya es el vínculo con el enchufe físico: solo se escribe al crearlo. */
export function FormularioEnchufe({ inicial, agentes = [], etiquetaBoton, alEnviar }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [tuyaId, setTuyaId] = useState(inicial?.tuya_id ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo_aparato ?? "");
  const [altoRiesgo, setAltoRiesgo] = useState(inicial?.alto_riesgo ?? false);
  const [minutos, setMinutos] = useState(inicial?.umbral_minutos_encendido ? String(inicial.umbral_minutos_encendido) : "");
  // Con un solo agente en la casa se propone ese; con varios, la persona elige (o deja que el primero que lo lea se lo quede).
  const [agenteId, setAgenteId] = useState<string>(inicial ? (inicial.agente_id ?? SIN_AGENTE) : agentes.length === 1 ? agentes[0].id : SIN_AGENTE);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutosNumero = minutos.trim() ? Number(minutos) : null;
  const minutosInvalidos = altoRiesgo && minutosNumero != null && !(Number.isInteger(minutosNumero) && minutosNumero > 0);

  async function enviar() {
    setError(null);
    setCargando(true);
    try {
      await alEnviar({
        tuya_id: tuyaId.trim(),
        nombre: nombre.trim(),
        tipo_aparato: tipo.trim() || null,
        alto_riesgo: altoRiesgo,
        umbral_minutos_encendido: altoRiesgo ? minutosNumero : null,
        agente_id: agenteId === SIN_AGENTE ? null : agenteId,
      });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Campo etiqueta="Nombre" placeholder="Nevera, ventilador…" value={nombre} onChangeText={setNombre} />
      <Campo
        etiqueta="ID del dispositivo en Tuya"
        ayuda={inicial ? "El ID no se puede cambiar." : "En Smart Life: toca el enchufe, el lápiz o los tres puntos, Información del dispositivo, ID del dispositivo."}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!inicial}
        value={tuyaId}
        onChangeText={setTuyaId}
      />
      {agentes.length > 0 && (
        <>
          <Selector
            etiqueta="¿Qué agente lo lee?"
            opciones={[{ valor: SIN_AGENTE, titulo: "Ninguno" }, ...agentes.map((a) => ({ valor: a.id, titulo: a.nombre }))]}
            valor={agenteId}
            alCambiar={setAgenteId}
          />
          <Texto variante="secundario" color={colores.textoSecundario}>
            Solo ese agente manda sus lecturas y lo puede prender o apagar. Debe estar en la misma WiFi del enchufe. «Ninguno»: lo toma el primer agente que lo lea.
          </Texto>
        </>
      )}
      <Campo etiqueta="Aparato conectado (opcional)" placeholder="Nevera, televisor…" value={tipo} onChangeText={setTipo} />
      <Casilla marcada={altoRiesgo} alCambiar={setAltoRiesgo} texto="Avisarme si se queda encendido demasiado tiempo (aparato de alto riesgo)" />
      {altoRiesgo && (
        <Campo
          etiqueta="Minutos encendido antes de avisar"
          keyboardType="number-pad"
          value={minutos}
          onChangeText={setMinutos}
          ayuda={minutosInvalidos ? "Escribe un número entero mayor que 0." : undefined}
        />
      )}
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo={etiquetaBoton} onPress={enviar} cargando={cargando} deshabilitado={!nombre.trim() || !tuyaId.trim() || minutosInvalidos} />
    </>
  );
}
