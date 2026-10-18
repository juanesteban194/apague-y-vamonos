import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { borrarLecturaMedidor, ErrorApi, registrarLecturaMedidor } from "@/api/cliente";
import type { LecturaMedidor as LecturaMedidorTipo } from "@/api/tipos";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { DineroMovimientos } from "@/components/DineroMovimientos";
import { Icono } from "@/components/Icono";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { EncabezadoSeccion, IconoEnCaja } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useLecturasMedidor } from "@/features/prepago/hooks";
import { formatoNumero } from "@/lib/formato";
import { exito } from "@/lib/haptica";
import { AREA_TOQUE_MIN, colores, espacio, fuentes } from "@/theme";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10-01" → "1 de octubre" (con el año solo si no es el actual). Se lee del texto, sin depender de la zona horaria. */
function fechaCorta(fecha: string): string {
  const anio = Number(fecha.slice(0, 4));
  const texto = `${Number(fecha.slice(8, 10))} de ${MESES[Number(fecha.slice(5, 7)) - 1]}`;
  return anio === new Date().getFullYear() ? texto : `${texto} de ${anio}`;
}

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
    Alert.alert(`¿Borrar la lectura ${formatoNumero(l.lectura_kwh)}?`, `Anotada el ${fechaCorta(l.fecha)}. Después puedes anotar la correcta.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: async () => {
          await borrarLecturaMedidor(hogar!.id, l.id).catch(() => {});
          await cliente.invalidateQueries();
        },
      },
    ]);
  }

  async function guardar() {
    if (!hogar || !valida) return;
    setError(null);
    setCargando(true);
    try {
      await registrarLecturaMedidor(hogar.id, numero);
      await cliente.invalidateQueries();
      exito();
      router.back();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos guardar. Revisa tu conexión e intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario centrado={false}>
      <View style={{ gap: espacio.m }}>
        <IconoEnCaja nombre="medidor" tamano={48} />
        <Texto variante="titulo" accessibilityRole="header">
          Lectura del medidor
        </Texto>
        <Texto color={colores.textoSecundario}>
          Con la lectura de tu medidor de EPM sabemos cuánto lleva toda la casa, no solo los enchufes. Así te avisamos antes de pasar la línea de subsistencia.
        </Texto>
      </View>

      <Tarjeta style={{ padding: 18, gap: espacio.l }}>
        <Campo
          etiqueta="Número que marca tu medidor"
          placeholder="45238"
          keyboardType="decimal-pad"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={() => void guardar()}
          returnKeyType="done"
          ayuda="Es el total acumulado en kWh: el mismo número que sale en tu factura."
          style={{ minHeight: 64, fontSize: 28, fontFamily: fuentes.seminegrita, letterSpacing: -0.6, fontVariant: ["tabular-nums"] }}
        />
        {error && (
          <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "500" }}>
            {error}
          </Texto>
        )}
        <Boton titulo="Guardar lectura" onPress={guardar} cargando={cargando} deshabilitado={!valida} />
      </Tarjeta>

      {lecturas && lecturas.length > 0 && (
        <View style={{ gap: espacio.m }}>
          <EncabezadoSeccion titulo="Anotaciones anteriores" detalle="¿Te equivocaste al escribir un número? Bórralo y anota el correcto." />
          <DineroMovimientos
            filas={lecturas.map((l, i) => {
              // Lo que avanzó el medidor desde la anotación anterior (la lista viene de la más reciente a la más antigua).
              const anterior = lecturas[i + 1];
              const avance = anterior ? Math.round((l.lectura_kwh - anterior.lectura_kwh) * 10) / 10 : null;
              return {
                clave: l.id,
                valor: `${formatoNumero(l.lectura_kwh)} kWh`,
                detalle: fechaCorta(l.fecha),
                nota: avance != null && avance > 0 ? `+${formatoNumero(avance)} kWh` : undefined,
                destacada: i === 0 && lecturas.length > 1,
                derecha: (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Borrar la lectura ${formatoNumero(l.lectura_kwh)} del ${fechaCorta(l.fecha)}`}
                    onPress={() => confirmarBorrado(l)}
                    hitSlop={4}
                    style={({ pressed }) => ({ minWidth: AREA_TOQUE_MIN, minHeight: AREA_TOQUE_MIN, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colores.rojoFondo : "transparent" })}
                  >
                    <Icono nombre="borrar" tamano={20} color={colores.rojo} />
                  </Pressable>
                ),
              };
            })}
          />
        </View>
      )}
    </PantallaFormulario>
  );
}
