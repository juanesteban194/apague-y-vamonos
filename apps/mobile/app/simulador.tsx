import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";

import { ErrorApi, simularRetiq } from "@/api/cliente";
import { useHogarActual } from "@/api/hogar";
import type { SimuladorResultado } from "@/api/tipos";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { ConsejoVeredicto } from "@/components/ConsejoVeredicto";
import { PantallaFormulario } from "@/components/PantallaCompleta";
import { Icono } from "@/components/Icono";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { exito } from "@/lib/haptica";
import { leerPesos } from "@/lib/formato";
import { colores, espacio } from "@/theme";

// Supuestos que la persona puede cambiar. Son del equipo de desarrollo, no de una norma: por eso se muestran y se explican.
const TASA_INICIAL = "12";
const ANIOS_INICIALES = "10";

const leerNumero = (t: string) => {
  const n = Number(t.trim().replace(",", "."));
  return t.trim() !== "" && Number.isFinite(n) ? n : null;
};

/** ¿Te conviene cambiar el dispositivo? (HU-05). Compara lo que gasta hoy (lo mide el enchufe) con lo que dice la etiqueta RETIQ del nuevo. */
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
  // Al calcular, la pantalla baja sola hasta el veredicto: queda debajo del botón y, si no, habría que buscarlo.
  const desplazamiento = useRef<ScrollView>(null);
  const bajarAlResultado = useRef(false);

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
      bajarAlResultado.current = true;
      exito();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "No pudimos calcular. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const r = resultado;
  const costoActual = r?.precio_kwh_usado != null ? valores.actual! * r.precio_kwh_usado : null;
  const costoNuevo = r?.precio_kwh_usado != null ? valores.nuevo! * r.precio_kwh_usado : null;

  return (
    <PantallaFormulario centrado={false} refDesplazamiento={desplazamiento}>
      <SugerenciaAyuda tema="simulador" />
      <View style={{ gap: 6 }}>
        <Texto variante="tituloGrande" accessibilityRole="header">
          ¿Te conviene cambiarlo?
        </Texto>
        <Texto color={colores.textoSecundario}>Compara lo que gasta hoy con lo que gastaría uno nuevo, según su etiqueta de eficiencia (RETIQ).</Texto>
      </View>

      <Tarjeta style={{ padding: 18, gap: espacio.l }}>
        <Campo
          etiqueta="Lo que gasta hoy (kWh al mes)"
          keyboardType="decimal-pad"
          value={actual}
          onChangeText={setActual}
          ayuda={kwhMedido ? "Lo midió tu enchufe en los últimos días." : "Búscalo en la etiqueta del dispositivo que tienes."}
        />
        <Campo
          etiqueta="Lo que gastaría el nuevo (kWh al mes)"
          keyboardType="decimal-pad"
          value={nuevo}
          onChangeText={setNuevo}
          ayuda="Viene en su etiqueta de eficiencia. Si dice por año, divídelo entre 12."
        />
        <Campo etiqueta="Precio del dispositivo nuevo" keyboardType="number-pad" placeholder="$1.200.000" value={precio} onChangeText={setPrecio} />
      </Tarjeta>

      {error && (
        <Tarjeta variante="rojo" style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
          <Icono nombre="alertaLinea" tamano={20} color={colores.rojo} />
          <Texto accessibilityRole="alert" color={colores.rojo} style={{ fontWeight: "500", flex: 1 }}>
            {error}
          </Texto>
        </Tarjeta>
      )}
      <Boton titulo="Calcular" onPress={calcular} cargando={cargando} deshabilitado={!completo} />

      {r && (
        <View
          onLayout={(e) => {
            if (!bajarAlResultado.current) return;
            bajarAlResultado.current = false;
            desplazamiento.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - espacio.l), animated: true });
          }}
        >
          <ConsejoVeredicto resultado={r} costoActual={costoActual} costoNuevo={costoNuevo} anios={Math.round(valores.anios ?? 0)} />
        </View>
      )}

      <Tarjeta variante="plana" style={{ padding: 18, gap: espacio.l, marginTop: espacio.s }}>
        <View style={{ gap: 2 }}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Supuestos del cálculo
          </Texto>
          <Texto variante="secundario" color={colores.textoSecundario}>
            Puedes cambiarlos. Si lo haces, toca «Calcular» otra vez.
          </Texto>
        </View>
        <Campo
          etiqueta="Tasa anual para descontar el dinero (%)"
          keyboardType="decimal-pad"
          value={tasa}
          onChangeText={setTasa}
          ayuda="Lo que te rendiría la misma plata si no la gastaras en el dispositivo."
          style={{ backgroundColor: colores.tarjeta }}
        />
        <Campo
          etiqueta="Años que cuenta el ahorro"
          keyboardType="number-pad"
          value={anios}
          onChangeText={setAnios}
          ayuda="Cuántos años crees que te dura el dispositivo nuevo."
          style={{ backgroundColor: colores.tarjeta }}
        />
      </Tarjeta>
    </PantallaFormulario>
  );
}
