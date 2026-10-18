import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";

import { cerrarSesion } from "@/api/sesion";
import { diaYNumero } from "@/lib/fechas";
import { formatoNumero, leerPesos } from "@/lib/formato";
import { leerHora, textoDias } from "@/lib/horarios";
import Inicio from "../app/(tabs)/index";
import LecturaMedidor from "../app/medidor";
import Prepago from "../app/prepago";
import EditarRutina from "../app/rutina/[id]";
import NuevaRutina from "../app/rutina/nueva";

import { HOGAR, iniciarSesionDePrueba, renderizar, respuestaJson, RESUMEN } from "./auxiliares";

const fetchMock = jest.fn();
const ENCHUFE = { id: "d1", tuya_id: "tuya1", nombre: "Plancha", tipo_aparato: null, alto_riesgo: true, umbral_minutos_encendido: 30 };
const PREPAGO = { estado: "ok", saldo_cop: 18000, registrado_en: new Date(Date.now() - 3600_000).toISOString(), promedio_diario_cop: 4000, dias_restantes: 4.5, se_acaba_el: new Date(Date.now() + 4.5 * 86_400_000).toISOString(), nivel: "verde", registros: [{ saldo_cop: 18000, registrado_en: new Date(Date.now() - 3600_000).toISOString() }, { saldo_cop: 22000, registrado_en: new Date(Date.now() - 86_400_000).toISOString() }] };
const RUTINA = { id: "r1", dispositivo_id: "d1", dispositivo_nombre: "Plancha", dias: [0, 1, 2, 3, 4], hora_apagado: "22:00:00", hora_encendido: "06:00:00", activa: true, ahorro_estimado_cop_mes: 9000, ultima_ejecucion: null };

type Ruta = unknown | ((init: RequestInit) => Response);
function api(extra: Record<string, Ruta> = {}) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const clave = `${init.method ?? "GET"} ${url.replace("https://api.test", "")}`;
    const rutas: Record<string, Ruta> = {
      "GET /hogares": [HOGAR],
      "GET /hogares/h1/dispositivos": [ENCHUFE],
      "GET /hogares/h1/prepago": PREPAGO,
      "GET /hogares/h1/lecturas-medidor": [{ id: "l1", lectura_kwh: 45238.5, fecha: "2026-10-01" }],
      "GET /hogares/h1/rutinas": [RUTINA],
      "GET /hogares/h1/resumen": RESUMEN,
      ...extra,
    };
    const r = rutas[clave];
    if (r === undefined) return respuestaJson({ detail: `sin simular ${clave}` }, 404);
    return typeof r === "function" ? (r as (i: RequestInit) => Response)(init) : respuestaJson(r);
  });
}
const enviado = (clave: string) => {
  const c = fetchMock.mock.calls.find(([u, i]) => `${i?.method ?? "GET"} ${String(u).replace("https://api.test", "")}` === clave);
  return c ? JSON.parse(c[1].body ?? "null") : undefined;
};
const sinContenido = () => ({ ok: true, status: 204, json: async () => undefined }) as Response;

beforeEach(async () => {
  fetchMock.mockReset();
  (router.push as jest.Mock).mockClear();
  (router.back as jest.Mock).mockClear();
  (globalThis as { __parametros?: object }).__parametros = {};
  global.fetch = fetchMock as unknown as typeof fetch;
  await cerrarSesion();
  await iniciarSesionDePrueba();
});

describe("Saldo prepago", () => {
  it("muestra la proyección y las anotaciones anteriores", async () => {
    api();
    await renderizar(<Prepago />);
    expect(await screen.findByText(/le alcanza hasta el .* Son unos 5 días\./)).toBeTruthy(); // 4,5 días → "unos 5 días" como lo diría la persona
    expect(screen.getByText("Sus anotaciones")).toBeTruthy();
    expect(screen.getAllByText(/\$22\.000 · hace 24 h|\$22\.000 · hace 1 día|\$22\.000/).length).toBeGreaterThan(0);
  });

  it("guarda el saldo que escribe, aunque lo escriba con puntos y signo de pesos", async () => {
    api({ "PUT /hogares/h1/prepago": () => respuestaJson(PREPAGO) });
    await renderizar(<Prepago />);
    const guardar = await screen.findByRole("button", { name: "Guardar saldo" });
    expect(guardar.props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText("Saldo que muestra su medidor ahora"), "$28.500");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar saldo" }));
    await waitFor(() => expect(enviado("PUT /hogares/h1/prepago")).toEqual({ saldo_cop: 28500 }));
    expect(router.back).toHaveBeenCalled();
  });

  it("si el servidor rechaza el saldo muestra el motivo", async () => {
    api({ "PUT /hogares/h1/prepago": () => respuestaJson({ detail: "Saldo inválido" }, 422) });
    await renderizar(<Prepago />);
    await screen.findByText("Sus anotaciones");
    await fireEvent.changeText(screen.getByLabelText("Saldo que muestra su medidor ahora"), "100");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar saldo" }));
    expect(await screen.findByText("Saldo inválido")).toBeTruthy();
  });
});

describe("Lectura del medidor", () => {
  it("guarda la lectura y lista las anteriores con miles", async () => {
    api({ "POST /hogares/h1/lecturas-medidor": () => respuestaJson({ id: "l2", lectura_kwh: 45300, fecha: "2026-10-13" }, 201) });
    await renderizar(<LecturaMedidor />);
    expect(await screen.findByText("45.238,5 · 2026-10-01")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Número que marca su medidor"), "45300");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar lectura" }));
    await waitFor(() => expect(enviado("POST /hogares/h1/lecturas-medidor")).toEqual({ lectura_kwh: 45300 }));
  });

  it("explica por qué se rechaza una lectura menor que la anterior", async () => {
    api({ "POST /hogares/h1/lecturas-medidor": () => respuestaJson({ detail: "La lectura no puede ser menor que la anterior (45238.5)." }, 422) });
    await renderizar(<LecturaMedidor />);
    await screen.findByText("Anotaciones anteriores");
    await fireEvent.changeText(screen.getByLabelText("Número que marca su medidor"), "100");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar lectura" }));
    expect(await screen.findByText(/no puede ser menor que la anterior/)).toBeTruthy();
  });

  it("no deja guardar un texto que no es número", async () => {
    api();
    await renderizar(<LecturaMedidor />);
    await screen.findByText("Anotaciones anteriores");
    await fireEvent.changeText(screen.getByLabelText("Número que marca su medidor"), "abc");
    expect(screen.getByRole("button", { name: "Guardar lectura" }).props.accessibilityState.disabled).toBe(true);
  });
});

describe("Rutinas", () => {
  it("crea una rutina: dispositivo único elegido, todos los días y la hora de apagado", async () => {
    api({ "POST /hogares/h1/rutinas": () => respuestaJson(RUTINA, 201) });
    await renderizar(<NuevaRutina />);
    await screen.findByLabelText("Apagar a las");
    expect(screen.getByRole("button", { name: "Guardar rutina" }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText("Apagar a las"), "22:00");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar rutina" }));
    await waitFor(() => expect(enviado("POST /hogares/h1/rutinas")).toEqual({ dispositivo_id: "d1", dias: [0, 1, 2, 3, 4, 5, 6], hora_apagado: "22:00:00", hora_encendido: null, activa: true }));
    expect(router.back).toHaveBeenCalled();
  });

  it("elige días y hora de encendido, y valida el formato de 24 horas", async () => {
    api({ "POST /hogares/h1/rutinas": () => respuestaJson(RUTINA, 201) });
    await renderizar(<NuevaRutina />);
    await screen.findByLabelText("Apagar a las");
    await fireEvent.press(screen.getByRole("button", { name: "Sáb" })); // quita sábado y domingo
    await fireEvent.press(screen.getByRole("button", { name: "Dom" }));
    await fireEvent.changeText(screen.getByLabelText("Apagar a las"), "25:00");
    expect(screen.getByRole("button", { name: "Guardar rutina" }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText(/formato 24 horas/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Apagar a las"), "23:30");
    await fireEvent.press(screen.getByRole("checkbox", { name: "Volver a prenderlo después" }));
    await fireEvent.changeText(screen.getByLabelText("Prender a las"), "23:30");
    expect(screen.getByText("La hora de encendido debe ser distinta de la de apagado.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Prender a las"), "6:15");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar rutina" }));
    await waitFor(() => expect(enviado("POST /hogares/h1/rutinas")).toMatchObject({ dias: [0, 1, 2, 3, 4], hora_apagado: "23:30:00", hora_encendido: "06:15:00" }));
  });

  it("sin días elegidos no deja guardar", async () => {
    api();
    await renderizar(<NuevaRutina />);
    await screen.findByLabelText("Apagar a las");
    for (const d of ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]) await fireEvent.press(screen.getByRole("button", { name: d }));
    await fireEvent.changeText(screen.getByLabelText("Apagar a las"), "22:00");
    expect(screen.getByRole("button", { name: "Guardar rutina" }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText("Elige al menos un día.")).toBeTruthy();
  });

  it("sin enchufes explica qué hacer primero", async () => {
    api({ "GET /hogares/h1/dispositivos": [] });
    await renderizar(<NuevaRutina />);
    expect(await screen.findByText(/Primero agrega un enchufe \(Explorar › Enchufes\)/)).toBeTruthy();
  });

  it("edita una rutina con sus datos cargados y la guarda", async () => {
    (globalThis as { __parametros?: object }).__parametros = { id: "r1" };
    api({ "PUT /hogares/h1/rutinas/r1": () => respuestaJson(RUTINA) });
    await renderizar(<EditarRutina />);
    expect((await screen.findByLabelText("Apagar a las")).props.value).toBe("22:00");
    expect(screen.getByLabelText("Prender a las").props.value).toBe("06:00");
    await fireEvent.changeText(screen.getByLabelText("Apagar a las"), "21:30");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(enviado("PUT /hogares/h1/rutinas/r1")).toMatchObject({ dispositivo_id: "d1", hora_apagado: "21:30:00", hora_encendido: "06:00:00", dias: [0, 1, 2, 3, 4] }));
  });

  it("borrar pide confirmación", async () => {
    (globalThis as { __parametros?: object }).__parametros = { id: "r1" };
    api({ "DELETE /hogares/h1/rutinas/r1": sinContenido });
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderizar(<EditarRutina />);
    await fireEvent.press(await screen.findByRole("button", { name: "Borrar rutina" }));
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false);
    const botones = alerta.mock.calls[0][2]!;
    await botones.find((b) => b.style === "destructive")!.onPress!();
    expect(fetchMock.mock.calls.some(([u, i]) => i?.method === "DELETE" && String(u).endsWith("/rutinas/r1"))).toBe(true);
  });
});

describe("Línea de subsistencia en Inicio", () => {
  const con = (s: object) => ({ ...RESUMEN, subsistencia: { limite_kwh: 130, consumo_kwh: 80, porcentaje: 0.62, fuente: "enchufes", nivel: "verde", ...s } });

  it("verde: dice cuánto lleva en porcentaje (sin kWh) y aclara que solo cuenta los enchufes", async () => {
    api({ "GET /hogares/h1/resumen": con({}) });
    await renderizar(<Inicio />);
    expect(await screen.findByText("Lleva el 62 % de la energía que EPM le subsidia este mes.")).toBeTruthy();
    expect(screen.getByText("Cuenta solo lo que miden sus enchufes, no toda la casa.")).toBeTruthy();
    expect(screen.getByRole("progressbar").props.accessibilityValue.now).toBe(62);
    expect(screen.queryByText(/kWh/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Anotar lectura del medidor" }));
    expect(router.push).toHaveBeenCalledWith("/medidor");
  });

  it("amarillo y rojo cambian el mensaje", async () => {
    api({ "GET /hogares/h1/resumen": con({ porcentaje: 0.85, nivel: "amarillo" }) });
    const { unmount } = await renderizar(<Inicio />);
    expect(await screen.findByText("Ya lleva el 85 %: se acerca a la línea de subsistencia.")).toBeTruthy();
    await unmount();
    api({ "GET /hogares/h1/resumen": con({ porcentaje: 1.12, nivel: "rojo" }) });
    await renderizar(<Inicio />);
    expect(await screen.findByText("Ya pasó la línea: desde aquí la energía le sale más cara.")).toBeTruthy();
  });

  it("con lectura del medidor no pide anotarla", async () => {
    api({ "GET /hogares/h1/resumen": con({ fuente: "medidor" }) });
    await renderizar(<Inicio />);
    await screen.findByText(/Lleva el 62 %/);
    expect(screen.queryByRole("button", { name: "Anotar lectura del medidor" })).toBeNull();
  });
});

describe("utilidades", () => {
  it("textoDias", () => {
    expect(textoDias([0, 1, 2, 3, 4])).toBe("Lun a Vie");
    expect(textoDias([0, 1, 2, 3, 4, 5, 6])).toBe("Todos los días");
    expect(textoDias([4, 0, 2])).toBe("Lun, Mié, Vie");
    expect(textoDias([5, 6])).toBe("Sáb, Dom");
  });
  it("leerHora acepta 24 h y rechaza lo demás", () => {
    expect([leerHora("22:00"), leerHora("6:30"), leerHora(" 06:05 "), leerHora("00:00")]).toEqual(["22:00:00", "06:30:00", "06:05:00", "00:00:00"]);
    expect([leerHora("24:00"), leerHora("12:60"), leerHora("22"), leerHora("10 pm"), leerHora("")]).toEqual([null, null, null, null, null]);
  });
  it("leerPesos y formatoNumero", () => {
    expect([leerPesos("$28.500"), leerPesos("28500"), leerPesos("abc"), leerPesos("")]).toEqual([28500, 28500, null, null]);
    expect([formatoNumero(45238.5), formatoNumero(1000), formatoNumero(7)]).toEqual(["45.238,5", "1.000", "7"]);
  });
  it("diaYNumero", () => {
    expect(diaYNumero("2026-10-15T12:00:00")).toBe("jueves 15");
  });
});
