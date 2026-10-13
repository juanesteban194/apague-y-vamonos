import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { cerrarSesion } from "@/api/sesion";
import Dispositivo from "../app/dispositivo/[id]";

import { CONSUMO_DIA, HOGAR, iniciarSesionDePrueba, renderizar, respuestaJson, RESUMEN, WebSocketFalso } from "./auxiliares";

const fetchMock = jest.fn();

function api(extra: Record<string, () => Response> = {}, resumen: unknown = RESUMEN) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const clave = `${init.method ?? "GET"} ${url.replace("https://api.test", "")}`;
    if (extra[clave]) return extra[clave]();
    const rutas: Record<string, unknown> = {
      "GET /hogares": [HOGAR],
      "GET /hogares/h1/resumen": resumen,
      "GET /dispositivos/d1/consumo?periodo=dia": CONSUMO_DIA,
    };
    return clave in rutas ? respuestaJson(rutas[clave]) : respuestaJson({ detail: `sin simular ${clave}` }, 404);
  });
}
const ordenes = () => fetchMock.mock.calls.filter(([, i]) => i?.method === "POST").map(([u]) => String(u).replace("https://api.test", ""));
const interruptor = () => screen.findByRole("switch");

beforeEach(async () => {
  (globalThis as { __parametros?: object }).__parametros = { id: "d1" };
  fetchMock.mockReset();
  WebSocketFalso.instancias = [];
  global.fetch = fetchMock as unknown as typeof fetch;
  (global as unknown as { WebSocket: unknown }).WebSocket = WebSocketFalso;
  await cerrarSesion();
  await iniciarSesionDePrueba();
});

describe("Interruptor del aparato", () => {
  it("muestra el estado actual con la ayuda del mockup", async () => {
    api();
    await renderizar(<Dispositivo />);
    expect((await interruptor()).props.accessibilityState.checked).toBe(true);
    expect(screen.getByText("Está prendido")).toBeTruthy();
    expect(screen.getByText("Toque para apagarlo desde aquí")).toBeTruthy();
  });

  it("apagar: llama a la API y la pantalla pasa a 'Está apagado'", async () => {
    api({ "POST /dispositivos/d1/apagar": () => respuestaJson({ dispositivo_id: "d1", encendido: false, via: "agente" }) });
    await renderizar(<Dispositivo />);
    await fireEvent.press(await interruptor());
    await waitFor(() => expect(ordenes()).toEqual(["/dispositivos/d1/apagar"]));
    expect(await screen.findByText("Está apagado")).toBeTruthy();
    expect(screen.getByText("Toque para prenderlo desde aquí")).toBeTruthy();
  });

  it("prender cuando está apagado usa /encender", async () => {
    api(
      { "POST /dispositivos/d1/encender": () => respuestaJson({ dispositivo_id: "d1", encendido: true, via: "agente" }) },
      { ...RESUMEN, dispositivos: [{ ...RESUMEN.dispositivos[0], encendido: false, potencia_w: 0 }] },
    );
    await renderizar(<Dispositivo />);
    await screen.findByText("Está apagado");
    await fireEvent.press(await interruptor());
    await waitFor(() => expect(ordenes()).toEqual(["/dispositivos/d1/encender"]));
    expect(await screen.findByText("Está prendido")).toBeTruthy();
  });

  it("si la API no logra el cambio, avisa por qué y deja el estado como estaba", async () => {
    api({ "POST /dispositivos/d1/apagar": () => respuestaJson({ detail: "No se pudo apagar el aparato: no hay un agente conectado en tu casa." }, 503) });
    await renderizar(<Dispositivo />);
    await fireEvent.press(await interruptor());
    expect(await screen.findByText(/no hay un agente conectado en tu casa/)).toBeTruthy();
    expect(screen.getByText("Está prendido")).toBeTruthy();
  });

  it("si piden demasiados cambios seguidos muestra el aviso del servidor", async () => {
    api({ "POST /dispositivos/d1/apagar": () => respuestaJson({ detail: "Demasiados cambios seguidos. Espera un momento e intenta de nuevo." }, 429) });
    await renderizar(<Dispositivo />);
    await fireEvent.press(await interruptor());
    expect(await screen.findByText(/Demasiados cambios seguidos/)).toBeTruthy();
  });

  it("sin datos del enchufe no se puede controlar", async () => {
    api({}, { ...RESUMEN, dispositivos: [{ ...RESUMEN.dispositivos[0], encendido: null, potencia_w: null, ultima_lectura: null, en_linea: false }] });
    await renderizar(<Dispositivo />);
    const sw = await interruptor();
    expect(sw.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(sw);
    expect(ordenes()).toEqual([]);
  });
});
