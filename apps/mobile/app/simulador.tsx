import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { ErrorApi, simularRetiq } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import type { SimuladorResultado } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { formatoCOP, formatoNumero, leerPesos } from "@/lib/formato";
import { colores, espacio } from "@/theme";

// Supuestos que la persona puede cambiar. Son del equipo de desarrollo, no de una norma: por eso se muestran y se explican.
const TASA_INICIAL = "12";
const ANIOS_INICIALES = "10";

const leerNumero = (t: string) => {
  const n = Number(t.trim().replace(",", "."));
  return t.trim() !== "" && Number.isFinite(n) ? n : null;
};

/** ¿Le conviene cambiar el aparato? (HU-05). Compara lo que gasta hoy (lo mide el enchufe) con lo que dice la etiqueta RETIQ del nuevo. */
export default function Simulador() {
  const { kwh: kwhMedido } = useLocalSearchParams<{ dispositivo?: string; kwh?: string }>();
  const { hogar } = useHogarActual();
  const [actual, setActual] = useState(kwhMedido ? String(Math.round(Number(kwhMedido) * 10) / 10).replace(".", ",") : "");
  const [nuevo, setNuevo] = useState("");
  const [precio, setPrecio] = useState("");
  const [tasa, setTasa] = useState(TASA_INICIAL);
  const [anios, setAnios] = useState(ANIOS_INICIALES);
  const [resultado, setResultado] = useState<SimuladorResultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valores = { actual: leerNumero(actual), nuevo: leerNumero(nuevo), precio: leerPesos(precio), tasa: leerNumero(tasa), anios: leerNumero(anios) };
  const completo = Object.values(valores).every((v) => v != null) && (valores.anios as number) >= 1 && (valores.anios as number) <= 30 && (valores.tasa as number) >= 0 && (valores.tasa as number) <= 100;

  async function calcular() {
    if (!hogar || !completo) return;
    setError(null);
    setCargando(true);
    try {
      setResultado(
        await simularRetiq({
          hogar_id: hogar.id,
          consumo_actual_kwh_mes: valores.actual!,
          consumo_nuevo_kwh_mes: valores.nuevo!,
          precio_nuevo_cop: valores.precio!,
          tasa_anual: valores.tasa! / 100,
          anios: Math.round(valores.anios!),
        }),
      );
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No se pudo calcular. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const r = resultado;
  const costoActual = r?.precio_kwh_usado != null ? valores.actual! * r.precio_kwh_usado : null;
  const costoNuevo = r?.precio_kwh_usado != null ? valores.nuevo! * r.precio_kwh_usado : null;

  return (
    <PantallaFormulario>
      <SugerenciaAyuda tema="simulador" />
      <Texto variante="titulo">¿Le conviene cambiarlo?</Texto>
      <Texto color={colores.textoSecundario}>Comparamos lo que gasta hoy con lo que gastaría uno nuevo, usando la etiqueta de eficiencia (RETIQ) que traen los electrodomésticos en Colombia.</Texto>

      <Campo
        etiqueta="Lo que gasta hoy (kWh al mes)"
        keyboardType="decimal-pad"
        value={actual}
        onChangeText={setActual}
        ayuda={kwhMedido ? "Lo midió su enchufe en los últimos días." : "Búsquelo en la etiqueta del aparato actual."}
      />
      <Campo etiqueta="Lo que gastaría el nuevo (kWh al mes)" keyboardType="decimal-pad" value={nuevo} onChangeText={setNuevo} ayuda="Está impreso en la etiqueta de eficiencia del aparato nuevo (si dice por año, divídalo en 12)." />
      <Campo etiqueta="Precio del aparato nuevo" keyboardType="number-pad" placeholder="$1.200.000" value={precio} onChangeText={setPrecio} />

      <Tarjeta style={{ gap: espacio.s }}>
        <Texto variante="subtitulo" style={{ fontWeight: "800" }}>
          Supuestos (puede cambiarlos)
        </Texto>
        <Campo etiqueta="Tasa anual para descontar el dinero (%)" keyboardType="decimal-pad" value={tasa} onChangeText={setTasa} ayuda="Cuánto rendiría el mismo dinero si no lo gastara en el aparato." />
        <Campo etiqueta="Años que cuenta el ahorro" keyboardType="number-pad" value={anios} onChangeText={setAnios} ayuda="Cuántos años cree que le dura el aparato nuevo." />
      </Tarjeta>

      {error && (
        <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "600" }}>
          {error}
        </Texto>
      )}
      <Boton titulo="Calcular" onPress={calcular} cargando={cargando} deshabilitado={!completo} />

      {r && (
        <View accessibilityLiveRegion="polite" style={{ backgroundColor: colores.texto, borderRadius: 24, padding: 22, gap: 10 }}>
          <Texto variante="secundario" color="#B9B3A6" style={{ fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
            {r.conviene ? "Sí le conviene" : "No le conviene"}
          </Texto>
          {r.precio_kwh_usado == null ? (
            <Texto color={colores.sobrePrimario}>Aún no hay tarifa cargada para su estrato, así que no podemos pasar el ahorro a pesos.</Texto>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 18, padding: 15 }}>
                  <Texto variante="secundario" color="#B9B3A6" style={{ fontWeight: "700" }}>La que tiene</Texto>
                  <Texto variante="cifraMedia" color={colores.sobrePrimario}>{formatoCOP(costoActual)}</Texto>
                  <Texto variante="secundario" color="#B9B3A6">al mes</Texto>
                </View>
                <View style={{ flex: 1, backgroundColor: colores.verdeFondo, borderRadius: 18, padding: 15 }}>
                  <Texto variante="secundario" color={colores.verde} style={{ fontWeight: "700" }}>Una nueva</Texto>
                  <Texto variante="cifraMedia" color="#12261B">{formatoCOP(costoNuevo)}</Texto>
                  <Texto variante="secundario" color={colores.verde}>al mes</Texto>
                </View>
              </View>
              {r.ahorro_cop_mes > 0 ? (
                <>
                  <Texto color={colores.sobrePrimario} style={{ fontSize: 18 }}>
                    Se ahorraría cerca de <Texto color={colores.sobrePrimario} style={{ fontWeight: "800", fontSize: 18 }}>{formatoCOP(r.ahorro_cop_mes)} cada mes</Texto>.
                    {r.texto_recuperacion ? ` Si la nueva cuesta ${formatoCOP(valores.precio)}, se paga sola en ${r.texto_recuperacion}.` : ""}
                  </Texto>
                  <Texto variante="secundario" color="#C9C3B6">
                    Contando {Math.round(valores.anios!)} años y descontando el valor del dinero, el balance es de {r.vpn_cop != null && r.vpn_cop >= 0 ? "+" : "−"}{formatoCOP(Math.abs(r.vpn_cop ?? 0))}
                    {r.vpn_cop != null && r.vpn_cop < 0 ? ": no alcanza a pagarse." : "."}
                  </Texto>
                </>
              ) : (
                <Texto color={colores.sobrePrimario}>El aparato nuevo no gastaría menos que el actual: no hay ahorro que pague la compra.</Texto>
              )}
              <Texto variante="secundario" color="#B9B3A6">
                Cada kWh se valora a {formatoCOP(r.precio_kwh_usado)}; si pasó la línea de subsistencia, a la tarifa más alta.
                {` (${formatoNumero(r.ahorro_kwh_mes)} kWh de ahorro al mes)`}
              </Texto>
            </>
          )}
        </View>
      )}
    </PantallaFormulario>
  );
}
