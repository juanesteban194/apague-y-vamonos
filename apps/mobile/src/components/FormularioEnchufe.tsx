import { useState } from "react";

import { ErrorApi } from "@/api/cliente";
import type { Dispositivo } from "@/api/tipos";
import { colores } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Casilla } from "./Casilla";
import { Texto } from "./Texto";

export type DatosEnchufe = {
  tuya_id: string;
  nombre: string;
  tipo_aparato: string | null;
  alto_riesgo: boolean;
  umbral_minutos_encendido: number | null;
};

type Props = { inicial?: Dispositivo; etiquetaBoton: string; alEnviar: (datos: DatosEnchufe) => Promise<void> };

/** Alta y edición de un enchufe. El ID de Tuya es el vínculo con el enchufe físico: solo se escribe al crearlo. */
export function FormularioEnchufe({ inicial, etiquetaBoton, alEnviar }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [tuyaId, setTuyaId] = useState(inicial?.tuya_id ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo_aparato ?? "");
  const [altoRiesgo, setAltoRiesgo] = useState(inicial?.alto_riesgo ?? false);
  const [minutos, setMinutos] = useState(inicial?.umbral_minutos_encendido ? String(inicial.umbral_minutos_encendido) : "");
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
