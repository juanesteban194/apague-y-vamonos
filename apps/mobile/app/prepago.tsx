import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { type RefObject, useRef, useState } from "react";
import { type TextInput, type TextInputProps, View } from "react-native";

import { ErrorApi, registrarSaldo } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { DineroMovimientos } from "@/components/DineroMovimientos";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { EncabezadoSeccion } from "@/components/Primitivos";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaPrepago } from "@/components/TarjetaPrepago";
import { Texto } from "@/components/Texto";
import { usePrepago } from "@/features/prepago/hooks";
import { haceCuanto } from "@/lib/fechas";
import { formatoCOP, leerPesos } from "@/lib/formato";
import { exito } from "@/lib/haptica";
import { colores, espacio, fuentes } from "@/theme";

/** `Campo` pasa sus props al TextInput y en React 19 la `ref` es una prop más, pero su tipo no la declara todavía. */
const conRef = (ref: RefObject<TextInput | null>) => ({ ref }) as unknown as TextInputProps;

export default function Prepago() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: prepago } = usePrepago(hogar?.id);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const campo = useRef<TextInput>(null);
  const saldo = leerPesos(texto);

  async function guardar() {
    if (!hogar || saldo == null) return;
    setError(null);
    setCargando(true);
    try {
      const nuevo = await registrarSaldo(hogar.id, saldo);
      cliente.setQueryData(["prepago", hogar.id], nuevo);
      await cliente.invalidateQueries({ queryKey: ["alertas", hogar.id] }); // un saldo bajo puede generar un aviso al instante
      exito();
      setTexto("");
      router.back();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos guardar. Revisa tu conexión e intenta de nuevo.");
      setCargando(false);
    }
  }

  const registros = prepago?.registros ?? []; // del más reciente al más antiguo

  return (
    <PantallaFormulario centrado={false}>
      <SugerenciaAyuda tema="prepago" />
      <TarjetaPrepago prepago={prepago} alActualizar={() => campo.current?.focus()} />

      <Tarjeta style={{ padding: 18, gap: espacio.l }}>
        <Campo
          {...conRef(campo)}
          etiqueta="Saldo que muestra tu medidor ahora"
          placeholder="$0"
          keyboardType="number-pad"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={() => void guardar()}
          returnKeyType="done"
          ayuda="Anótalo cada día o cada dos días. Si recargaste, anota el saldo nuevo."
          style={{
            minHeight: 64,
            fontSize: 28,
            fontFamily: fuentes.seminegrita,
            letterSpacing: -0.6,
            fontVariant: ["tabular-nums"],
          }}
        />
        {error && (
          <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "500" }}>
            {error}
          </Texto>
        )}
        <Boton titulo="Guardar saldo" onPress={guardar} cargando={cargando} deshabilitado={saldo == null} />
      </Tarjeta>

      {registros.length > 0 && (
        <View style={{ gap: espacio.m }}>
          <EncabezadoSeccion titulo="Tus anotaciones" detalle="Con ellas calculamos cuánto te dura el saldo." />
          <DineroMovimientos
            filas={registros.map((r, i) => {
              // Lo que cambió desde la anotación anterior: si subió, fue una recarga.
              const anterior = registros[i + 1];
              const cambio = anterior ? r.saldo_cop - anterior.saldo_cop : null;
              return {
                clave: r.registrado_en,
                valor: formatoCOP(r.saldo_cop),
                detalle: haceCuanto(r.registrado_en),
                nota: cambio == null || cambio === 0 ? undefined : cambio > 0 ? `Recarga de ${formatoCOP(cambio)}` : `Gastaste ${formatoCOP(-cambio)}`,
                tonoNota: cambio != null && cambio > 0 ? "verde" : "neutro",
                destacada: i === 0 && registros.length > 1,
              };
            })}
          />
        </View>
      )}
    </PantallaFormulario>
  );
}
