import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";

import { ErrorApi, registrarSaldo } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaPrepago } from "@/components/TarjetaPrepago";
import { Texto } from "@/components/Texto";
import { usePrepago } from "@/features/prepago/hooks";
import { haceCuanto } from "@/lib/fechas";
import { formatoCOP, leerPesos } from "@/lib/formato";
import { colores } from "@/theme";

export default function Prepago() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: prepago } = usePrepago(hogar?.id);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saldo = leerPesos(texto);

  async function guardar() {
    if (!hogar || saldo == null) return;
    setError(null);
    setCargando(true);
    try {
      const nuevo = await registrarSaldo(hogar.id, saldo);
      cliente.setQueryData(["prepago", hogar.id], nuevo);
      await cliente.invalidateQueries({ queryKey: ["alertas", hogar.id] }); // un saldo bajo puede generar un aviso al instante
      setTexto("");
      router.back();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario>
      <Texto variante="titulo">Saldo prepago</Texto>
      <TarjetaPrepago prepago={prepago} alActualizar={() => {}} />
      <Campo
        etiqueta="Saldo que muestra su medidor ahora"
        placeholder="$28.500"
        keyboardType="number-pad"
        value={texto}
        onChangeText={setTexto}
        ayuda="Anótelo cada día o cada dos días: mientras más anotaciones, más exacto el cálculo. Si recargó, anote el saldo nuevo."
      />
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo="Guardar saldo" onPress={guardar} cargando={cargando} deshabilitado={saldo == null} />
      {prepago && prepago.registros.length > 0 && (
        <Tarjeta style={{ gap: 6 }}>
          <Texto variante="subtitulo">Sus anotaciones</Texto>
          {prepago.registros.map((r) => (
            <Texto key={r.registrado_en} color={colores.textoSecundario}>
              {formatoCOP(r.saldo_cop)} · {haceCuanto(r.registrado_en)}
            </Texto>
          ))}
        </Tarjeta>
      )}
    </PantallaFormulario>
  );
}
