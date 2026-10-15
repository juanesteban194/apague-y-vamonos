import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { borrarLecturaMedidor, ErrorApi, registrarLecturaMedidor } from "@/api/cliente";
import type { LecturaMedidor as LecturaMedidorTipo } from "@/api/tipos";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useLecturasMedidor } from "@/features/prepago/hooks";
import { formatoNumero } from "@/lib/formato";
import { Icono } from "@/components/Icono";
import { AREA_TOQUE_MIN, colores } from "@/theme";

export default function LecturaMedidor() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: lecturas } = useLecturasMedidor(hogar?.id);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const numero = Number(texto.replace(",", "."));
  const valida = texto.trim() !== "" && Number.isFinite(numero) && numero >= 0;

  function confirmarBorrado(l: LecturaMedidorTipo) {
    Alert.alert(
      `¿Borrar la lectura ${formatoNumero(l.lectura_kwh)}?`,
      `Anotada para el ${l.fecha}. Después puedes anotar la correcta.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar",
          style: "destructive",
          onPress: async () => {
            await borrarLecturaMedidor(hogar!.id, l.id).catch(() => {});
            await cliente.invalidateQueries();
          },
        },
      ],
    );
  }

  async function guardar() {
    if (!hogar || !valida) return;
    setError(null);
    setCargando(true);
    try {
      await registrarLecturaMedidor(hogar.id, numero);
      await cliente.invalidateQueries();
      router.back();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario>
      <Texto variante="titulo">Lectura del medidor</Texto>
      <Texto color={colores.textoSecundario}>
        Con la lectura de su medidor de EPM sabemos cuánto lleva de toda la casa (no solo de los enchufes) y le avisamos antes de pasar la línea de subsistencia.
      </Texto>
      <Campo etiqueta="Número que marca su medidor" placeholder="45238" keyboardType="decimal-pad" value={texto} onChangeText={setTexto} ayuda="Es el total acumulado, el mismo número de la factura." />
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo="Guardar lectura" onPress={guardar} cargando={cargando} deshabilitado={!valida} />
      {lecturas && lecturas.length > 0 && (
        <Tarjeta style={{ gap: 6 }}>
          <Texto variante="subtitulo">Anotaciones anteriores</Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>¿Te equivocaste al escribir un número? Bórralo y anota el correcto.</Texto>
          {lecturas.map((l) => (
            <View key={l.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 48 }}>
              <Texto color={colores.textoSecundario} style={{ flex: 1 }}>
                {formatoNumero(l.lectura_kwh)} · {l.fecha}
              </Texto>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Borrar la lectura ${formatoNumero(l.lectura_kwh)} del ${l.fecha}`}
                onPress={() => confirmarBorrado(l)}
                style={{ minWidth: AREA_TOQUE_MIN, minHeight: AREA_TOQUE_MIN, alignItems: "center", justifyContent: "center" }}
              >
                <Icono nombre="borrar" tamano={22} color={colores.rojo} />
              </Pressable>
            </View>
          ))}
        </Tarjeta>
      )}
    </PantallaFormulario>
  );
}
