/** Diseño de Inicio: el semáforo siempre se ve, «Ahora mismo» suma lo que ya viene del backend y «Qué está gastando más» ordena por costo. */
import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { cerrarSesion } from "@/api/sesion";
import { TarjetaPrepago } from "@/components/TarjetaPrepago";
import Inicio from "../app/(tabs)/index";

import { HOGAR, iniciarSesionDePrueba, renderizar, respuestaJson, RESUMEN } from "./auxiliares";

const fetchMock = jest.fn();
const BASE = RESUMEN.dispositivos[0];
const DISPOSITIVOS = [
  { ...BASE, id: "d1", nombre: "Computador", encendido: false, potencia_w: 0, costo_hoy_cop: 210 },
  { ...BASE, id: "d2", nombre: "Nevera", encendido: true, potencia_w: 92.4, costo_hoy_cop: 1280 },
  { ...BASE, id: "d3", nombre: "Lavadora", encendido: null, potencia_w: null, ultima_lectura: null, en_linea: false, costo_hoy_cop: 0 },
  { ...BASE, id: "d4", nombre: "Televisor", encendido: true, potencia_w: 1100.2, costo_hoy_cop: 640 },
];

function api(resumen: object = {}) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const clave = `${init.method ?? "GET"} ${url.replace("https://api.test", "")}`;
    const rutas: Record<string, unknown> = { "GET /hogares": [HOGAR], "GET /hogares/h1/resumen": { ...RESUMEN, ...resumen } };
    return clave in rutas ? respuestaJson(rutas[clave]) : respuestaJson({ detail: `sin simular ${clave}` }, 404);
  });
}

beforeEach(async () => {
  fetchMock.mockReset();
  (router.push as jest.Mock).mockClear();
  global.fetch = fetchMock as unknown as typeof fetch;
  await cerrarSesion();
  await iniciarSesionDePrueba();
});

describe("Semáforo de Inicio", () => {
  it("sin histórico se ve en reposo, sin inventar un color, y lleva a anotar las facturas", async () => {
    api();
    await renderizar(<Inicio />);
    await screen.findByText(RESUMEN.semaforo.titulo); // el esqueleto de carga también dibuja el semáforo en reposo: se espera el resumen
    expect(screen.getByLabelText(/^Semáforo apagado/)).toBeTruthy();
    expect(screen.queryByLabelText(/^Semáforo en/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Anotar mis facturas" }));
    expect(router.push).toHaveBeenCalledWith("/historial");
  });

  it("sin lectura del medidor también se ve en reposo y la primera acción es anotarla", async () => {
    api({ semaforo: { ...RESUMEN.semaforo, estado: "sin_medidor", titulo: "Falta la lectura del medidor", mensaje: "Anota la lectura de tu medidor." } });
    await renderizar(<Inicio />);
    await screen.findByText("Falta la lectura del medidor");
    expect(screen.getByLabelText(/^Semáforo apagado/)).toBeTruthy();
    await fireEvent.press(screen.getAllByRole("button", { name: "Anotar lectura del medidor" })[0]);
    expect(router.push).toHaveBeenCalledWith("/medidor");
  });

  it("con nivel enciende la luz que corresponde", async () => {
    api({ semaforo: { ...RESUMEN.semaforo, estado: "ok", nivel: "amarillo", titulo: "Vas medio alto", mensaje: "Si sigues así, este mes pagas unos $6.400 más que tu promedio." } });
    await renderizar(<Inicio />);
    expect(await screen.findByLabelText("Semáforo en amarillo")).toBeTruthy();
    expect(screen.queryByLabelText(/^Semáforo apagado/)).toBeNull();
  });
});

describe("Lo de hoy y ahora mismo", () => {
  it("«Ahora mismo» suma los vatios de los prendidos y dice cuántos hay prendidos", async () => {
    api({ dispositivos: DISPOSITIVOS });
    await renderizar(<Inicio />);
    expect(await screen.findByLabelText("Ahora mismo: 1.193 W en uso. Prendidos: 2 de 4.")).toBeTruthy();
    expect(screen.getByText("1.193 W en uso")).toBeTruthy();
  });

  it("con todo apagado lo dice", async () => {
    api({ dispositivos: DISPOSITIVOS.map((d) => ({ ...d, encendido: false, potencia_w: 0 })) });
    await renderizar(<Inicio />);
    expect(await screen.findByText("Ninguno está prendido")).toBeTruthy();
  });

  it("un costo de cero se escribe «$0» y no «$0,00»", async () => {
    api({ dispositivos: DISPOSITIVOS });
    await renderizar(<Inicio />);
    expect(await screen.findByRole("button", { name: "Lavadora, Sin datos. Hoy $0" })).toBeTruthy();
    expect(screen.queryByText("$0,00")).toBeNull();
  });

  it("sin enchufes invita a conectar uno", async () => {
    api({ dispositivos: [] });
    await renderizar(<Inicio />);
    expect(await screen.findByText("Aún no tienes enchufes")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Conectar un enchufe" }));
    expect(router.push).toHaveBeenCalledWith("/enchufe/nuevo");
  });
});

describe("Qué está gastando más", () => {
  it("ordena los dispositivos por lo que llevan hoy, de mayor a menor", async () => {
    api({ dispositivos: DISPOSITIVOS });
    await renderizar(<Inicio />);
    await screen.findByText("Qué está gastando más");
    const nombres = screen.getAllByRole("button", { name: /^(Computador|Nevera|Lavadora|Televisor), / }).map((b) => String(b.props.accessibilityLabel).split(",")[0]);
    expect(nombres).toEqual(["Nevera", "Televisor", "Computador", "Lavadora"]);
  });
});

describe("Tarjeta de prepago", () => {
  const PREPAGO = { estado: "ok" as const, saldo_cop: 5200, registrado_en: null, promedio_diario_cop: 3500, dias_restantes: 1.2, se_acaba_el: new Date(Date.now() + 86_400_000).toISOString(), nivel: "rojo" as const, registros: [] };

  it("con un solo día lo dice en buen español", async () => {
    await renderizar(<TarjetaPrepago prepago={PREPAGO} alActualizar={() => {}} />);
    expect(screen.getByText(/te alcanza hasta el .*\. Es más o menos un día\./)).toBeTruthy();
    expect(screen.getByText("Medidor prepago · se acaba pronto")).toBeTruthy();
  });

  it("sin registros invita a anotar el saldo, en tú", async () => {
    await renderizar(<TarjetaPrepago prepago={undefined} alActualizar={() => {}} />);
    expect(screen.getByText("Anota el saldo que muestra tu medidor y te decimos cuántos días te alcanza.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Anotar mi saldo" })).toBeTruthy();
  });
});
