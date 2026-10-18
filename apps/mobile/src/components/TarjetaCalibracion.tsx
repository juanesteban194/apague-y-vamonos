import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";

import { calibrarDispositivo, ErrorApi, quitarCalibracion } from "@/api/cliente";
import type { Calibracion, Dispositivo } from "@/api/tipos";
import { formatoPotencia } from "@/lib/formato";
import { exito } from "@/lib/haptica";
import { colores, espacio, radios } from "@/theme";

import { Boton } from "./Boton";
import { Campo } from "./Campo";
import { Pasos } from "./GestionPiezas";
import { Icono } from "./Icono";
import { IconoEnCaja, Pastilla } from "./Primitivos";
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
      if (r) exito();
      await cliente.invalidateQueries();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos calibrar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Tarjeta style={{ gap: espacio.l, padding: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <IconoEnCaja nombre="medidorLinea" tamano={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <Texto variante="subtitulo">Calibrar los vatios</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Opcional · con un medidor de referencia
          </Texto>
        </View>
      </View>
      {calibrado && <Pastilla texto="Este enchufe ya está calibrado" tono="verde" icono="okLinea" />}
      <Texto color={colores.textoSecundario}>
        Si un medidor confiable (por ejemplo, un cabezote con pantalla) marca otros vatios que la app, ajusta este enchufe para que coincida.
      </Texto>

      <Pasos
        pasos={[
          "Conecta un dispositivo que gaste al menos 5 W y déjalo prendido unos segundos, sin cambiarlo.",
          "Mira cuántos vatios marca tu medidor y escríbelo aquí.",
        ]}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: radios.m,
          backgroundColor: lecturaActualW != null ? colores.verdeFondo : colores.tarjetaHundida,
        }}
      >
        <Icono nombre="rayo" tamano={20} color={lecturaActualW != null ? colores.verde : colores.textoSecundario} />
        <Texto color={lecturaActualW != null ? colores.verde : colores.textoSecundario} style={{ flex: 1, fontWeight: lecturaActualW != null ? "600" : "400" }}>
          {lecturaActualW != null ? `El enchufe marca ahora: ${formatoPotencia(lecturaActualW)}` : "El enchufe no está enviando lecturas ahora mismo."}
        </Texto>
      </View>

      <Campo etiqueta="Lo que marca tu medidor (W)" keyboardType="decimal-pad" placeholder="44" value={texto} onChangeText={setTexto} />
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "500" }}>
          {error}
        </Texto>
      )}
      <Boton
        titulo="Calibrar ahora"
        variante="secundario"
        onPress={() => void ejecutar(() => calibrarDispositivo(hogarId, dispositivo.id, referencia!))}
        cargando={cargando}
        deshabilitado={referencia == null}
      />

      {resultado && (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <Icono nombre="ok" tamano={20} color={colores.verde} />
          <Texto color={colores.verde} style={{ flex: 1, fontWeight: "600" }}>
            Listo: antes leía {formatoPotencia(resultado.lectura_antes_w)} y ahora lee {formatoPotencia(resultado.lectura_despues_w)}.
          </Texto>
        </View>
      )}
      {calibrado && (
        <View style={{ gap: espacio.s }}>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Calibrado con un medidor de {formatoPotencia(dispositivo.calibracion_referencia_w!)} (ajuste de {ajuste} %). Vale para las lecturas nuevas; el historial no cambia.
          </Texto>
          <Boton titulo="Quitar la calibración" variante="texto" compacto onPress={() => void ejecutar(() => quitarCalibracion(hogarId, dispositivo.id))} deshabilitado={cargando} />
        </View>
      )}
    </Tarjeta>
  );
}
