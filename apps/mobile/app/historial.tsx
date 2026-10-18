import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Fragment, useEffect, useState } from "react";
import { View } from "react-native";

import { ErrorApi, guardarHistorial } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import type { MesFactura } from "@/api/tipos";
import { BarraProgreso } from "@/components/BarraProgreso";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Icono } from "@/components/Icono";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Separador } from "@/components/Primitivos";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useHistorial } from "@/features/consejos/hooks";
import { mesesAnteriores } from "@/lib/fechas";
import { formatoCOP, formatoNumero, leerPesos } from "@/lib/formato";
import { exito } from "@/lib/haptica";
import { colores, espacio, fuentes, radios } from "@/theme";

const MESES = 6; // el histórico de la factura de EPM trae 6 meses
type Fila = { mes: string; nombre: string; kwh: string; pagado: string };

export function leerKwh(texto: string): number | null {
  const n = Number(texto.trim().replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
}

const conMayuscula = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;
const ESTILO_CIFRA = { fontSize: 20, fontFamily: fuentes.seminegrita, fontVariant: ["tabular-nums" as const] };

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
      exito();
      router.back();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos guardar. Revisa tu conexión e intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <PantallaFormulario centrado={false}>
      <View style={{ gap: espacio.s }}>
        <Texto variante="titulo" accessibilityRole="header">
          Tus facturas de EPM
        </Texto>
        <Texto color={colores.textoSecundario}>
          Copia los kWh de cada mes del cuadro «Histórico de consumos» de tu factura. Con eso sabemos tu promedio y si este mes vas por debajo.
        </Texto>
      </View>

      {guardado?.promedio_kwh != null && (
        <Tarjeta variante="verde" style={{ padding: 20, gap: 4, borderRadius: radios.xl }}>
          <Texto variante="etiqueta" color={colores.verde}>
            Tu promedio hoy
          </Texto>
          <Texto variante="cifraMedia">
            {formatoNumero(guardado.promedio_kwh)}
            <Texto variante="cuerpo" color={colores.textoSecundario} style={{ fontWeight: "500" }}>
              {" "}kWh al mes
            </Texto>
          </Texto>
          {guardado.promedio_cop != null && (
            <Texto variante="secundario" color={colores.textoSecundario}>
              Pagas unos {formatoCOP(Math.round(guardado.promedio_cop))} por factura.
            </Texto>
          )}
        </Tarjeta>
      )}

      {filas && (
        <View style={{ gap: espacio.s }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Texto variante="subtitulo" accessibilityRole="header">
              Mes a mes
            </Texto>
            <Texto variante="secundario" color={colores.textoSecundario} style={{ fontVariant: ["tabular-nums"] }}>
              {llenos.length} de {MESES} anotados
            </Texto>
          </View>
          <BarraProgreso proporcion={llenos.length / MESES} color={llenos.length >= 3 ? colores.semaforoVerde : colores.semaforoAmbar} descripcion={`${llenos.length} de ${MESES} meses anotados`} alto={6} />
        </View>
      )}

      {filas && (
        <Tarjeta style={{ padding: 0, gap: 0 }}>
          {lista.map((f, i) => {
            const nombre = conMayuscula(f.nombre);
            const [mes, anio] = nombre.split(" de ");
            const lleno = leerKwh(f.kwh) != null;
            return (
              <Fragment key={f.mes}>
                {i > 0 && <Separador sangria={espacio.l} />}
                <View style={{ padding: espacio.l, gap: espacio.m }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
                    <Texto style={{ fontWeight: "600" }}>{mes}</Texto>
                    <Texto color={colores.textoSecundario} style={{ flex: 1 }}>
                      {anio}
                    </Texto>
                    {lleno && <Icono nombre="ok" tamano={20} color={colores.semaforoVerde} />}
                  </View>
                  <View style={{ flexDirection: "row", gap: espacio.m }}>
                    <View style={{ flex: 1 }}>
                      <Campo
                        etiqueta="kWh"
                        accessibilityLabel={`${nombre}: kWh gastados`}
                        keyboardType="decimal-pad"
                        placeholder="170"
                        value={f.kwh}
                        onChangeText={(v) => cambiar(f.mes, "kwh", v)}
                        error={f.kwh.trim() !== "" && !lleno}
                        style={ESTILO_CIFRA}
                      />
                    </View>
                    <View style={{ flex: 1.3 }}>
                      <Campo
                        etiqueta="Pagaste (opcional)"
                        accessibilityLabel={`${nombre}: lo que pagó (opcional)`}
                        keyboardType="number-pad"
                        placeholder="$150.000"
                        value={f.pagado}
                        onChangeText={(v) => cambiar(f.mes, "pagado", v)}
                        style={ESTILO_CIFRA}
                      />
                    </View>
                  </View>
                </View>
              </Fragment>
            );
          })}
        </Tarjeta>
      )}

      {llenos.length > 0 && llenos.length < 3 && (
        <Texto variante="secundario" color={colores.ambar}>
          Con menos de 3 meses el promedio no es confiable: anota al menos 3.
        </Texto>
      )}
      {error && (
        <Texto accessibilityRole="alert" variante="secundario" color={colores.rojo} style={{ fontWeight: "500" }}>
          {error}
        </Texto>
      )}
      <Boton titulo="Guardar mis facturas" onPress={guardar} cargando={cargando} deshabilitado={!filas || invalido || llenos.length === 0} />
    </PantallaFormulario>
  );
}
