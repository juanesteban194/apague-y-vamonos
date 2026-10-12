import { useState } from "react";

import type { Hogar } from "@/api/tipos";
import { ErrorApi } from "@/api/cliente";
import { OPCIONES_ESTRATO, OPCIONES_MEDIDOR } from "@/lib/textos";
import { colores } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Selector } from "./Selector";
import { Texto } from "./Texto";

export type DatosHogar = { nombre: string; barrio: string | null; estrato: number; tipo_medidor: string | null };

type Props = { inicial?: Hogar; etiquetaBoton: string; alEnviar: (datos: DatosHogar) => Promise<void> };

/** Nombre, barrio, estrato y medidor: lo usan la creación del hogar y su edición. */
export function FormularioHogar({ inicial, etiquetaBoton, alEnviar }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [barrio, setBarrio] = useState(inicial?.barrio ?? "");
  const [estrato, setEstrato] = useState<number | null>(inicial?.estrato ?? null);
  const [medidor, setMedidor] = useState<string | null>(inicial?.tipo_medidor ?? null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setError(null);
    setCargando(true);
    try {
      await alEnviar({ nombre: nombre.trim(), barrio: barrio.trim() || null, estrato: estrato!, tipo_medidor: medidor });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Campo etiqueta="Nombre del hogar" placeholder="Mi casa" value={nombre} onChangeText={setNombre} />
      <Campo etiqueta="Barrio (opcional)" value={barrio} onChangeText={setBarrio} />
      <Selector etiqueta="Estrato" opciones={OPCIONES_ESTRATO.map((e) => ({ valor: e, titulo: String(e) }))} valor={estrato} alCambiar={setEstrato} />
      <Selector etiqueta="Tipo de medidor (opcional)" opciones={OPCIONES_MEDIDOR} valor={medidor} alCambiar={setMedidor} />
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo={etiquetaBoton} onPress={enviar} cargando={cargando} deshabilitado={!nombre.trim() || estrato == null} />
    </>
  );
}
