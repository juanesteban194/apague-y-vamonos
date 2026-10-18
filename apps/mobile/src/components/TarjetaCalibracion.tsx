import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { calibrarDispositivo, ErrorApi, quitarCalibracion } from "@/api/cliente";
import type { Calibracion, Dispositivo } from "@/api/tipos";
import { formatoPotencia } from "@/lib/formato";
import { colores, espacio } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Tarjeta } from "./Tarjeta";
import { Texto } from "./Texto";

type Props = {
  hogarId: string;
  dispositivo: Dispositivo;
  lecturaActualW: number | null; // lo que el enchufe marca ahora, si está prendido
};

const leerVatios = (texto: string): number | null => {
  const n = Number(texto.trim().replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(n) && n > 0 && n <= 3000 ? n : null;
};

/** Ajusta los vatios del enchufe para que coincidan con un medidor confiable (por ejemplo, un cabezote con pantalla).
 *  El ajuste vale para las lecturas nuevas: el historial no cambia. */
export function TarjetaCalibracion({ hogarId, dispositivo, lecturaActualW }: Props) {
  const cliente = useQueryClient();
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Calibracion | null>(null);
  const referencia = leerVatios(texto);
  const calibrado = dispositivo.factor_calibracion !== 1 && dispositivo.calibracion_referencia_w != null;
  const ajuste = ((dispositivo.factor_calibracion - 1) * 100).toFixed(1).replace(".", ",");

  async function ejecutar(accion: () => Promise<Calibracion | void>) {
    setError(null);
    setCargando(true);
    try {
      const r = await accion();
      setResultado(r ?? null);
      setTexto("");
      await cliente.invalidateQueries();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo calibrar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Tarjeta style={{ gap: espacio.s }}>
      <Texto variante="subtitulo">Calibrar los vatios</Texto>
      <Texto color={colores.textoSecundario}>
        Si un medidor confiable (por ejemplo, un cabezote con pantalla) marca otros vatios que la app, puedes ajustar este enchufe para que coincida.
      </Texto>
      <Texto>1. Conecta un dispositivo que gaste al menos 5 W y déjalo prendido unos segundos, sin cambiarlo.</Texto>
      <Texto>2. Mira cuántos vatios marca tu medidor y escríbelo aquí.</Texto>
      <Texto style={{ fontWeight: "700" }}>
        {lecturaActualW != null ? `El enchufe marca ahora: ${formatoPotencia(lecturaActualW)}` : "El enchufe no está enviando lecturas ahora mismo."}
      </Texto>
      <Campo etiqueta="Lo que marca tu medidor (W)" keyboardType="decimal-pad" placeholder="44" value={texto} onChangeText={setTexto} />
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo="Calibrar ahora" onPress={() => void ejecutar(() => calibrarDispositivo(hogarId, dispositivo.id, referencia!))} cargando={cargando} deshabilitado={referencia == null} />
      {resultado && (
        <Texto color={colores.verde} style={{ fontWeight: "700" }}>
          Listo: antes leía {formatoPotencia(resultado.lectura_antes_w)} y ahora lee {formatoPotencia(resultado.lectura_despues_w)}.
        </Texto>
      )}
      {calibrado && (
        <>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Calibrado con un medidor de {formatoPotencia(dispositivo.calibracion_referencia_w!)} (ajuste de {ajuste} %). Vale para las lecturas nuevas; el historial no cambia.
          </Texto>
          <Boton titulo="Quitar la calibración" variante="secundario" onPress={() => void ejecutar(() => quitarCalibracion(hogarId, dispositivo.id))} deshabilitado={cargando} />
        </>
      )}
    </Tarjeta>
  );
}
