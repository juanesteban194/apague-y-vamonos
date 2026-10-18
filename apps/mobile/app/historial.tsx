import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { ErrorApi, guardarHistorial } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import type { MesFactura } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useHistorial } from "@/features/consejos/hooks";
import { mesesAnteriores } from "@/lib/fechas";
import { formatoNumero, leerPesos } from "@/lib/formato";
import { colores, espacio } from "@/theme";

const MESES = 6; // el histórico de la factura de EPM trae 6 meses
type Fila = { mes: string; nombre: string; kwh: string; pagado: string };

export function leerKwh(texto: string): number | null {
  const n = Number(texto.trim().replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
}

/** Los 6 meses del cuadro "Histórico de consumos" de la factura: de ahí sale el promedio contra el que se mide el ahorro. */
export default function Historial() {
  const cliente = useQueryClient();
  const { hogar } = useHogarActual();
  const { data: guardado } = useHistorial(hogar?.id);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guardado || filas) return;
    const por_mes = new Map(guardado.meses.map((m) => [m.mes, m]));
    setFilas(
      mesesAnteriores(MESES).map(({ mes, nombre }) => {
        const m = por_mes.get(mes);
        return { mes, nombre, kwh: m ? String(m.kwh) : "", pagado: m?.valor_cop != null ? formatoNumero(m.valor_cop) : "" };
      }),
    );
  }, [guardado, filas]);

  const lista = filas ?? [];
  const llenos = lista.filter((f) => leerKwh(f.kwh) != null);
  const invalido = lista.some((f) => f.kwh.trim() !== "" && leerKwh(f.kwh) == null);
  const cambiar = (mes: string, campo: "kwh" | "pagado", valor: string) => setFilas((fs) => fs!.map((f) => (f.mes === mes ? { ...f, [campo]: valor } : f)));

  async function guardar() {
    if (!hogar) return;
    setError(null);
    setCargando(true);
    try {
      const meses: MesFactura[] = llenos.map((f) => ({ mes: f.mes, kwh: leerKwh(f.kwh)!, valor_cop: leerPesos(f.pagado) }));
      await guardarHistorial(hogar.id, meses);
      await cliente.invalidateQueries();
      router.back();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo guardar. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario>
      <Texto variante="titulo">Mis facturas de EPM</Texto>
      <Texto color={colores.textoSecundario}>
        Copie del cuadro «Histórico de consumos» de su factura cuántos kWh gastó cada mes. Con eso sabemos cuál es su promedio y si este mes va por debajo.
      </Texto>
      {guardado?.promedio_kwh != null && (
        <Tarjeta style={{ backgroundColor: colores.verdeFondo, gap: 2 }}>
          <Texto variante="secundario" color={colores.verde} style={{ fontWeight: "700" }}>
            Su promedio hoy
          </Texto>
          <Texto variante="subtitulo" style={{ fontWeight: "800" }}>
            {formatoNumero(guardado.promedio_kwh)} kWh al mes
            {guardado.promedio_cop != null ? ` · ${"$" + formatoNumero(Math.round(guardado.promedio_cop))} pagados` : ""}
          </Texto>
        </Tarjeta>
      )}
      {lista.map((f) => (
        <View key={f.mes} style={{ gap: espacio.s }}>
          <Campo etiqueta={`${f.nombre[0].toUpperCase()}${f.nombre.slice(1)}: kWh gastados`} keyboardType="decimal-pad" placeholder="170" value={f.kwh} onChangeText={(v) => cambiar(f.mes, "kwh", v)} />
          <Campo etiqueta={`${f.nombre[0].toUpperCase()}${f.nombre.slice(1)}: lo que pagó (opcional)`} keyboardType="number-pad" placeholder="$150.000" value={f.pagado} onChangeText={(v) => cambiar(f.mes, "pagado", v)} />
        </View>
      ))}
      {llenos.length > 0 && llenos.length < 3 && (
        <Texto variante="secundario" color={colores.ambar}>
          Con menos de 3 meses el promedio no es confiable: anote al menos 3.
        </Texto>
      )}
      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo="Guardar mis facturas" onPress={guardar} cargando={cargando} deshabilitado={!filas || invalido || llenos.length === 0} />
    </PantallaFormulario>
  );
}
