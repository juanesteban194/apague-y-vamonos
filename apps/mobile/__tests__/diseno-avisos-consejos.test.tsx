/** Rediseño de Avisos, Consejos y el simulador de cambio: orden, jerarquía, textos en tú y estados. */
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import { cerrarSesion } from "@/api/sesion";
import Avisos from "../app/(tabs)/avisos";
import Consejos from "../app/consejos";
import Simulador from "../app/simulador";

import { HOGAR, iniciarSesionDePrueba, renderizar, respuestaJson } from "./auxiliares";

const fetchMock = jest.fn();
const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const aviso = (id: string, extra: object) => ({ id, dispositivo_id: null, dispositivo_nombre: null, tipo: "subsistencia", nivel: "amarillo", titulo: `Aviso ${id}`, mensaje: "Detalle.", fecha: hace(30), leida: false, ...extra });
const consejo = (id: string, extra: object) => ({ id, tipo: "rutina", icono: "moon", titulo: `Consejo ${id}`, mensaje: "Detalle.", ahorro_cop_mes: null, accion: null, dispositivo_id: null, consumo_kwh_mes: null, ...extra });

function api(rutas: Record<string, unknown>) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const clave = `${init.method ?? "GET"} ${url.replace("https://api.test", "")}`;
    const todas: Record<string, unknown> = { "GET /hogares": [HOGAR], "GET /hogares/h1/preferencias-alertas": { sensibilidad: "normal" }, ...rutas };
    return clave in todas ? respuestaJson(todas[clave]) : respuestaJson({ detail: `sin simular ${clave}` }, 404);
  });
}

beforeEach(async () => {
  fetchMock.mockReset();
  (Haptics.selectionAsync as jest.Mock).mockClear();
  (globalThis as { __parametros?: object }).__parametros = {};
  global.fetch = fetchMock as unknown as typeof fetch;
  await cerrarSesion();
  await iniciarSesionDePrueba();
});

describe("Avisos", () => {
  it("separa los sin leer (con su cantidad) de los anteriores y dice el nivel con palabras, no solo con color", async () => {
    api({ "GET /hogares/h1/alertas": [aviso("a", { nivel: "rojo", tipo: "alto_riesgo", dispositivo_id: "d1" }), aviso("b", {}), aviso("c", { nivel: "verde", tipo: "prepago", leida: true })] });
    await renderizar(<Avisos />);
    expect(await screen.findByText("Sin leer")).toBeTruthy();
    expect(screen.getByLabelText("2 sin leer")).toBeTruthy();
    expect(screen.getByText("Anteriores")).toBeTruthy();
    expect(screen.getByText("Importante")).toBeTruthy();
    expect(screen.getByText("Para revisar")).toBeTruthy();
    expect(screen.getByText("Todo bien")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Marcar todos los avisos como leídos" })).toBeTruthy();
    // El leído ya no es un botón para marcarlo; el no leído sí
    expect(screen.queryByRole("button", { name: /^Todo bien\. Aviso c/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Importante\. Aviso a\..*Sin leer$/ })).toBeTruthy();
  });

  it("con todo leído dice que estás al día y no ofrece marcar como leídos", async () => {
    api({ "GET /hogares/h1/alertas": [aviso("a", { leida: true })] });
    await renderizar(<Avisos />);
    expect(await screen.findByText("Estás al día")).toBeTruthy();
    expect(screen.queryByText("Sin leer")).toBeNull();
    expect(screen.queryByRole("button", { name: /como leído/ })).toBeNull();
  });

  it("elegir otra sensibilidad vibra suave; tocar la que ya está elegida no", async () => {
    api({ "GET /hogares/h1/alertas": [], "PUT /hogares/h1/preferencias-alertas": { sensibilidad: "pocos" } });
    await renderizar(<Avisos />);
    const normales = await screen.findByRole("radio", { name: /Normales/ });
    await waitFor(() => expect(normales.props.accessibilityState.checked).toBe(true));
    await fireEvent.press(normales);
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("radio", { name: /Pocas/ }));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("habla de tú", async () => {
    api({ "GET /hogares/h1/alertas": [] });
    await renderizar(<Avisos />);
    await screen.findByText("Todo tranquilo");
    expect(screen.getByText("¿Cada cuánto te avisamos?")).toBeTruthy();
    expect(screen.queryByText(/\b(usted|le avisamos|su casa|Cuénteme)\b/i)).toBeNull();
  });
});

describe("Consejos", () => {
  it("arriba suma los ahorros que ya trae cada consejo", async () => {
    api({ "GET /hogares/h1/consejos": [consejo("1", { ahorro_cop_mes: 9800 }), consejo("2", { ahorro_cop_mes: 2100 }), consejo("3", { tipo: "completar" })] });
    await renderizar(<Consejos />);
    expect(await screen.findByLabelText("Podrías ahorrar unos $11.900 al mes")).toBeTruthy();
    expect(screen.getByText("$11.900")).toBeTruthy();
    expect(screen.getByText(/Sumando los 2 consejos que traen ahorro/)).toBeTruthy();
  });

  it("sin ahorros medidos no inventa una cifra: muestra el título", async () => {
    api({ "GET /hogares/h1/consejos": [consejo("1", { tipo: "completar" })] });
    await renderizar(<Consejos />);
    expect(await screen.findByText("Consejos para tu casa")).toBeTruthy();
    expect(screen.queryByText(/Podrías ahorrar/)).toBeNull();
  });

  it("el consejo de cambiar un dispositivo es la protagonista «Vale la pena pensarlo» (una sola)", async () => {
    const retiq = (id: string) => consejo(id, { tipo: "retiq", icono: "swap", titulo: `¿Te conviene cambiar ${id}?`, accion: "simulador", dispositivo_id: id, consumo_kwh_mes: 50 });
    api({ "GET /hogares/h1/consejos": [retiq("Nevera"), retiq("Lavadora")] });
    await renderizar(<Consejos />);
    expect(await screen.findAllByText("Vale la pena pensarlo")).toHaveLength(1);
    expect(screen.getByText("¿Te conviene cambiar Nevera?")).toBeTruthy();
    expect(screen.getByText("¿Te conviene cambiar Lavadora?")).toBeTruthy(); // el segundo sigue, como tarjeta normal
    expect(screen.getAllByRole("button", { name: "Comparar con uno nuevo" })).toHaveLength(2);
  });
});

describe("Simulador", () => {
  const RESULTADO = { ahorro_kwh_mes: 40, ahorro_cop_mes: 32585.2, precio_kwh_usado: 814.63, conviene: true, meses_recuperacion: 36.8, texto_recuperacion: "3 años y 1 mes", vpn_cop: 330000, pagado_en_vida_util: true };

  async function calcularCon(resultado: object) {
    (globalThis as { __parametros?: object }).__parametros = { kwh: "70" };
    api({ "POST /simulador/retiq": resultado });
    await renderizar(<Simulador />);
    await fireEvent.changeText(await screen.findByLabelText("Lo que gastaría el nuevo (kWh al mes)"), "30");
    await fireEvent.changeText(screen.getByLabelText("Precio del dispositivo nuevo"), "$1.200.000");
    await fireEvent.press(screen.getByRole("button", { name: "Calcular" }));
  }

  it("el veredicto va con su razón, y el costo de hoy y el del nuevo se leen como barras", async () => {
    await calcularCon(RESULTADO);
    expect(await screen.findByText("Sí te conviene")).toBeTruthy();
    expect(screen.getByText("En 10 años, lo que ahorras paga la compra y sobra.")).toBeTruthy();
    expect(screen.getByLabelText("El que tienes: $57.024 al mes")).toBeTruthy();
    expect(screen.getByLabelText("Uno nuevo: $24.439 al mes")).toBeTruthy();
    expect(screen.getByText(/Usamos tu tarifa de \$814,63 por kWh/)).toBeTruthy();
  });

  it("si ahorra pero no alcanza a pagarse, lo explica", async () => {
    await calcularCon({ ...RESULTADO, conviene: false, vpn_cop: -1500000, pagado_en_vida_util: false });
    expect(await screen.findByText("No te conviene")).toBeTruthy();
    expect(screen.getByText("Ahorras, pero en 10 años no alcanza a pagar lo que cuesta.")).toBeTruthy();
  });

  it("sin tarifa no dice «no te conviene»: dice qué falta", async () => {
    await calcularCon({ ...RESULTADO, precio_kwh_usado: null, ahorro_cop_mes: 0, conviene: false, vpn_cop: null, texto_recuperacion: null });
    expect(await screen.findByText("Falta la tarifa")).toBeTruthy();
    expect(screen.queryByText("No te conviene")).toBeNull();
  });

  it("los supuestos quedan visibles y explicados en tú", async () => {
    await renderizar(<Simulador />);
    expect(await screen.findByText("Supuestos del cálculo")).toBeTruthy();
    expect(screen.getByText("Cuántos años crees que te dura el dispositivo nuevo.")).toBeTruthy();
    expect(screen.queryByText(/\b(usted|su enchufe|Búsquelo|divídalo)\b/i)).toBeNull();
  });
});
