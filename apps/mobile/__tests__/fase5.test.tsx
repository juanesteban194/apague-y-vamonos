import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { cerrarSesion } from "@/api/sesion";
import { fechaLarga, mesesAnteriores } from "@/lib/fechas";
import Inicio from "../app/(tabs)/index";
import Consejos from "../app/consejos";
import Historial, { leerKwh } from "../app/historial";
import NuevaRutina from "../app/rutina/nueva";
import Simulador from "../app/simulador";

import { HOGAR, iniciarSesionDePrueba, renderizar, respuestaJson, RESUMEN } from "./auxiliares";

const fetchMock = jest.fn();
const ENCHUFE = { id: "d1", tuya_id: "t1", nombre: "Televisor", tipo_aparato: null, alto_riesgo: false, umbral_minutos_encendido: null };
const SEMAFORO = (s: object) => ({ ...RESUMEN.semaforo, estado: "ok", nivel: "verde", titulo: "Vas bien", mensaje: "Si sigue así, este mes paga unos $23.160 menos que su promedio.", promedio_kwh: 179.17, proyeccion_kwh: 155, diferencia_cop: -23160, ...s });
const HISTORIAL_VACIO = { meses: [], meses_usados: 0, promedio_kwh: null, promedio_cop: null };

type Ruta = unknown | ((init: RequestInit) => Response);
function api(extra: Record<string, Ruta> = {}) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const clave = `${init.method ?? "GET"} ${url.replace("https://api.test", "")}`;
    const rutas: Record<string, Ruta> = { "GET /hogares": [HOGAR], "GET /hogares/h1/resumen": RESUMEN, "GET /hogares/h1/dispositivos": [ENCHUFE], "GET /hogares/h1/historial-consumo": HISTORIAL_VACIO, ...extra };
    const r = rutas[clave];
    if (r === undefined) return respuestaJson({ detail: `sin simular ${clave}` }, 404);
    return typeof r === "function" ? (r as (i: RequestInit) => Response)(init) : respuestaJson(r);
  });
}
const enviado = (clave: string) => {
  const c = fetchMock.mock.calls.find(([u, i]) => `${i?.method ?? "GET"} ${String(u).replace("https://api.test", "")}` === clave);
  return c ? JSON.parse(c[1].body ?? "null") : undefined;
};

beforeEach(async () => {
  fetchMock.mockReset();
  (router.push as jest.Mock).mockClear();
  (router.back as jest.Mock).mockClear();
  (globalThis as { __parametros?: object }).__parametros = {};
  global.fetch = fetchMock as unknown as typeof fetch;
  await cerrarSesion();
  await iniciarSesionDePrueba();
});

describe("Semáforo en Inicio", () => {
  const conSemaforo = (s: object, extra: object = {}) => api({ "GET /hogares/h1/resumen": { ...RESUMEN, semaforo: SEMAFORO(s), ...extra } });

  it("verde: 'Vas bien' y cuánto menos pagaría que su promedio", async () => {
    conSemaforo({});
    await renderizar(<Inicio />);
    expect(await screen.findByText("Vas bien")).toBeTruthy();
    expect(screen.getByText("Si sigue así, este mes paga unos $23.160 menos que su promedio.")).toBeTruthy();
    expect(screen.getByLabelText("Semáforo en verde")).toBeTruthy();
    expect(screen.getByText("Lo compara con el promedio de sus últimas facturas de EPM.")).toBeTruthy();
  });

  it.each([["amarillo", "Vas medio alto"], ["rojo", "Vas alto"]])("%s: %s", async (nivel, titulo) => {
    conSemaforo({ nivel, titulo, mensaje: "Si sigue así, este mes paga unos $12.000 más que su promedio." });
    await renderizar(<Inicio />);
    expect(await screen.findByText(titulo)).toBeTruthy();
    expect(screen.getByLabelText(`Semáforo en ${nivel}`)).toBeTruthy();
  });

  it("sin histórico explica qué falta y lleva a anotar las facturas", async () => {
    api();
    await renderizar(<Inicio />);
    expect(await screen.findByText("Falta su histórico")).toBeTruthy();
    expect(screen.queryByLabelText(/Semáforo en/)).toBeNull(); // sin datos no se inventa un color
    await fireEvent.press(screen.getByRole("button", { name: "Anotar mis facturas" }));
    expect(router.push).toHaveBeenCalledWith("/historial");
  });

  it("sin lectura del medidor lleva a anotarla", async () => {
    conSemaforo({ estado: "sin_medidor", nivel: null, titulo: "Falta la lectura del medidor", mensaje: "Anote la lectura de su medidor en dos días distintos y le proyectamos cómo cierra el mes." });
    await renderizar(<Inicio />);
    await screen.findByText("Falta la lectura del medidor");
    // el aviso de subsistencia también ofrece anotar la lectura: se elige el botón de la tarjeta del semáforo
    await fireEvent.press(screen.getAllByRole("button", { name: "Anotar lectura del medidor" })[0]);
    expect(router.push).toHaveBeenCalledWith("/medidor");
  });

  it("muestra la fecha, el estrato y las equivalencias de lo gastado", async () => {
    api({ "GET /hogares/h1/resumen": { ...RESUMEN, equivalencias: [{ texto: "Es como dejar el televisor de la sala prendido 21 horas.", icono: "tv" }, { texto: "O cargar el celular 340 veces.", icono: "plug" }] } });
    await renderizar(<Inicio />);
    expect(await screen.findByText("Es como dejar el televisor de la sala prendido 21 horas.")).toBeTruthy();
    expect(screen.getByText("O cargar el celular 340 veces.")).toBeTruthy();
    expect(screen.getByText("Estrato 3")).toBeTruthy();
    expect(screen.getByText(fechaLarga(new Date()))).toBeTruthy();
  });

  it("no muestra kWh en Inicio", async () => {
    conSemaforo({});
    await renderizar(<Inicio />);
    await screen.findByText("Vas bien");
    expect(screen.queryByText(/kWh/)).toBeNull();
  });
});

describe("Consejos", () => {
  const CONSEJOS = [
    { id: "completar-historial", tipo: "completar", icono: "receipt", titulo: "Anote su factura de EPM", mensaje: "Con los meses…", ahorro_cop_mes: null, accion: "historial", dispositivo_id: null, consumo_kwh_mes: null },
    { id: "noche-d1", tipo: "rutina", icono: "moon", titulo: "Televisor gasta de noche", mensaje: "Entre las 11 p. m. y las 5 a. m. gasta unos $29.327 al mes.", ahorro_cop_mes: 29327, accion: "rutina", dispositivo_id: "d1", consumo_kwh_mes: null },
    { id: "retiq-d2", tipo: "retiq", icono: "swap", titulo: "¿Le conviene cambiar Nevera?", mensaje: "Gasta unos $58.000 al mes.", ahorro_cop_mes: null, accion: "simulador", dispositivo_id: "d2", consumo_kwh_mes: 72.04 },
  ];

  it("muestra cada consejo con su ahorro medido", async () => {
    api({ "GET /hogares/h1/consejos": CONSEJOS });
    await renderizar(<Consejos />);
    expect(await screen.findByText("Anote su factura de EPM")).toBeTruthy();
    expect(screen.getByText("Ahorra unos $29.327 al mes")).toBeTruthy();
    expect(screen.getByText("¿Le conviene cambiar Nevera?")).toBeTruthy();
    expect(screen.getAllByText(/Ahorra unos/)).toHaveLength(1); // solo el que tiene un ahorro medido
  });

  it("cada botón lleva a su pantalla con lo que hace falta", async () => {
    api({ "GET /hogares/h1/consejos": CONSEJOS });
    await renderizar(<Consejos />);
    await fireEvent.press(await screen.findByRole("button", { name: "Anotar mis facturas" }));
    await fireEvent.press(screen.getByRole("button", { name: "Programar el apagado" }));
    await fireEvent.press(screen.getByRole("button", { name: "Comparar con uno nuevo" }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual([
      "/historial",
      { pathname: "/rutina/nueva", params: { dispositivo: "d1" } },
      { pathname: "/simulador", params: { dispositivo: "d2", kwh: "72.04" } },
    ]);
  });

  it("sin consejos dice que todo está en orden", async () => {
    api({ "GET /hogares/h1/consejos": [] });
    await renderizar(<Consejos />);
    expect(await screen.findByText("Todo en orden")).toBeTruthy();
  });
});

describe("Mis facturas", () => {
  it("pide los 6 meses anteriores y guarda solo los que se llenaron", async () => {
    api({ "PUT /hogares/h1/historial-consumo": () => respuestaJson({ ...HISTORIAL_VACIO, meses_usados: 3, promedio_kwh: 170 }) });
    await renderizar(<Historial />);
    const seis = mesesAnteriores(6);
    const etiqueta = (i: number, parte: string) => `${seis[i].nombre[0].toUpperCase()}${seis[i].nombre.slice(1)}: ${parte}`;
    await screen.findByLabelText(etiqueta(0, "kWh gastados"));
    expect(screen.getByRole("button", { name: "Guardar mis facturas" }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText(etiqueta(0, "kWh gastados")), "170");
    await fireEvent.changeText(screen.getByLabelText(etiqueta(0, "lo que pagó (opcional)")), "$150.000");
    await fireEvent.changeText(screen.getByLabelText(etiqueta(1, "kWh gastados")), "194,5");
    await fireEvent.changeText(screen.getByLabelText(etiqueta(2, "kWh gastados")), "152");
    expect(screen.queryByText(/anote al menos 3/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Guardar mis facturas" }));
    await waitFor(() =>
      expect(enviado("PUT /hogares/h1/historial-consumo")).toEqual({
        meses: [
          { mes: seis[0].mes, kwh: 170, valor_cop: 150000 },
          { mes: seis[1].mes, kwh: 194.5, valor_cop: null },
          { mes: seis[2].mes, kwh: 152, valor_cop: null },
        ],
      }),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it("avisa si anota menos de 3 meses y no deja guardar un número inválido", async () => {
    api();
    await renderizar(<Historial />);
    const primero = mesesAnteriores(6)[0].nombre;
    const campo = await screen.findByLabelText(`${primero[0].toUpperCase()}${primero.slice(1)}: kWh gastados`);
    await fireEvent.changeText(campo, "170");
    expect(screen.getByText(/anote al menos 3/)).toBeTruthy();
    await fireEvent.changeText(campo, "mucho");
    expect(screen.getByRole("button", { name: "Guardar mis facturas" }).props.accessibilityState.disabled).toBe(true);
  });

  it("muestra lo ya guardado y su promedio", async () => {
    const seis = mesesAnteriores(6);
    api({ "GET /hogares/h1/historial-consumo": { meses: [{ mes: seis[0].mes, kwh: 170, valor_cop: 150000 }], meses_usados: 6, promedio_kwh: 179.17, promedio_cop: 160000 } });
    await renderizar(<Historial />);
    expect(await screen.findByText(/179,17 kWh al mes/)).toBeTruthy();
    const nombre = `${seis[0].nombre[0].toUpperCase()}${seis[0].nombre.slice(1)}`;
    expect((await screen.findByLabelText(`${nombre}: kWh gastados`)).props.value).toBe("170");
    expect(screen.getByLabelText(`${nombre}: lo que pagó (opcional)`).props.value).toBe("150.000");
  });
});

describe("Simulador de reemplazo", () => {
  const RESULTADO = { ahorro_kwh_mes: 40, ahorro_cop_mes: 32585.2, precio_kwh_usado: 814.63, conviene: true, meses_recuperacion: 36.8, texto_recuperacion: "3 años y 1 mes", vpn_cop: 330000, pagado_en_vida_util: true };

  async function llenar() {
    await fireEvent.changeText(screen.getByLabelText("Lo que gastaría el nuevo (kWh al mes)"), "30");
    await fireEvent.changeText(screen.getByLabelText("Precio del dispositivo nuevo"), "$1.200.000");
  }

  it("precarga lo que midió el enchufe y calcula con los supuestos visibles", async () => {
    (globalThis as { __parametros?: object }).__parametros = { dispositivo: "d2", kwh: "72.04" };
    api({ "POST /simulador/retiq": () => respuestaJson(RESULTADO) });
    await renderizar(<Simulador />);
    expect((await screen.findByLabelText("Lo que gasta hoy (kWh al mes)")).props.value).toBe("72");
    expect(screen.getByText("Lo midió su enchufe en los últimos días.")).toBeTruthy();
    expect(screen.getByLabelText("Tasa anual para descontar el dinero (%)").props.value).toBe("12");
    expect(screen.getByLabelText("Años que cuenta el ahorro").props.value).toBe("10");
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Calcular" }));
    await waitFor(() => expect(enviado("POST /simulador/retiq")).toEqual({ hogar_id: "h1", consumo_actual_kwh_mes: 72, consumo_nuevo_kwh_mes: 30, precio_nuevo_cop: 1200000, tasa_anual: 0.12, anios: 10 }));
  });

  it("dice cuánto ahorra, en cuánto se paga y el balance a los años", async () => {
    (globalThis as { __parametros?: object }).__parametros = { kwh: "70" };
    api({ "POST /simulador/retiq": () => respuestaJson(RESULTADO) });
    await renderizar(<Simulador />);
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Calcular" }));
    expect(await screen.findByText("Sí le conviene")).toBeTruthy();
    expect(screen.getByText(/\$32\.585 cada mes/)).toBeTruthy();
    expect(screen.getByText(/se paga sola en 3 años y 1 mes/)).toBeTruthy();
    expect(screen.getByText(/el balance es de \+\$330\.000\./)).toBeTruthy();
    expect(screen.getByText("$57.024")).toBeTruthy(); // 70 kWh × $814,63 lo que gasta hoy
    expect(screen.getByText("$24.439")).toBeTruthy(); // 30 kWh × $814,63 el nuevo
  });

  it("si no se alcanza a pagar lo dice con el signo y la razón", async () => {
    api({ "POST /simulador/retiq": () => respuestaJson({ ...RESULTADO, conviene: false, vpn_cop: -1500000, meses_recuperacion: 153, texto_recuperacion: "12 años y 9 meses", pagado_en_vida_util: false }) });
    await renderizar(<Simulador />);
    await fireEvent.changeText(await screen.findByLabelText("Lo que gasta hoy (kWh al mes)"), "70");
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Calcular" }));
    expect(await screen.findByText("No le conviene")).toBeTruthy();
    expect(screen.getByText(/el balance es de −\$1\.500\.000: no alcanza a pagarse\./)).toBeTruthy();
  });

  it("sin ahorro y sin tarifa no inventa nada", async () => {
    api({ "POST /simulador/retiq": () => respuestaJson({ ...RESULTADO, ahorro_cop_mes: 0, ahorro_kwh_mes: -10, conviene: false, meses_recuperacion: null, texto_recuperacion: null, vpn_cop: -1200000 }) });
    await renderizar(<Simulador />);
    await fireEvent.changeText(await screen.findByLabelText("Lo que gasta hoy (kWh al mes)"), "30");
    await llenar();
    await fireEvent.changeText(screen.getByLabelText("Lo que gastaría el nuevo (kWh al mes)"), "40");
    await fireEvent.press(screen.getByRole("button", { name: "Calcular" }));
    expect(await screen.findByText(/no gastaría menos que el actual/)).toBeTruthy();
  });

  it("sin tarifa dice que no puede pasarlo a pesos", async () => {
    api({ "POST /simulador/retiq": () => respuestaJson({ ...RESULTADO, precio_kwh_usado: null, ahorro_cop_mes: 0, conviene: false, vpn_cop: null, texto_recuperacion: null }) });
    await renderizar(<Simulador />);
    await fireEvent.changeText(await screen.findByLabelText("Lo que gasta hoy (kWh al mes)"), "70");
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Calcular" }));
    expect(await screen.findByText(/Aún no hay tarifa cargada/)).toBeTruthy();
  });

  it("no calcula con datos incompletos o fuera de rango", async () => {
    api();
    await renderizar(<Simulador />);
    const calcular = async () => screen.getByRole("button", { name: "Calcular" });
    await screen.findByLabelText("Precio del dispositivo nuevo");
    expect((await calcular()).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText("Lo que gasta hoy (kWh al mes)"), "70");
    await llenar();
    expect((await calcular()).props.accessibilityState.disabled).toBe(false);
    await fireEvent.changeText(screen.getByLabelText("Años que cuenta el ahorro"), "50");
    expect((await calcular()).props.accessibilityState.disabled).toBe(true);
  });
});

describe("Rutina que viene de un consejo", () => {
  it("llega con el dispositivo elegido y de 23:00 a 05:00", async () => {
    (globalThis as { __parametros?: object }).__parametros = { dispositivo: "d1" };
    api({ "GET /hogares/h1/dispositivos": [ENCHUFE, { ...ENCHUFE, id: "d9", nombre: "Otro" }] });
    await renderizar(<NuevaRutina />);
    expect((await screen.findByLabelText("Apagar a las")).props.value).toBe("23:00");
    expect(screen.getByLabelText("Prender a las").props.value).toBe("05:00");
    expect(screen.getByRole("button", { name: "Televisor" }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole("button", { name: "Otro" }).props.accessibilityState.selected).toBe(false);
  });
});

describe("utilidades", () => {
  it("fechaLarga y mesesAnteriores", () => {
    expect(fechaLarga(new Date(2026, 9, 13))).toBe("Martes, 13 de octubre");
    expect(mesesAnteriores(3, new Date(2026, 9, 13)).map((m) => m.mes)).toEqual(["2026-09-01", "2026-08-01", "2026-07-01"]);
    expect(mesesAnteriores(2, new Date(2026, 0, 5)).map((m) => m.nombre)).toEqual(["diciembre de 2025", "noviembre de 2025"]); // cruza el año
  });
  it("leerKwh", () => {
    expect([leerKwh("170"), leerKwh("194,5"), leerKwh(" 3.5 "), leerKwh("0")]).toEqual([170, 194.5, 3.5, 0]);
    expect([leerKwh(""), leerKwh("mucho"), leerKwh("-4")]).toEqual([null, null, null]);
  });
});
