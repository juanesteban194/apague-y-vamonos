/** Eliminar avisos ya leídos: deslizando uno (o con la acción del lector de pantalla) y «Borrar todos», siempre preguntando antes. */
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";

import { cerrarSesion } from "@/api/sesion";
import { useTiempoReal } from "@/realtime/estado";
import Avisos from "../app/(tabs)/avisos";

import { HOGAR, iniciarSesionDePrueba, renderizar, respuestaJson, WebSocketFalso } from "./auxiliares";

jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: "proyecto-eas" } } } } }));

const fetchMock = jest.fn();
const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const aviso = (id: string, titulo: string, leida: boolean) => ({ id, dispositivo_id: null, dispositivo_nombre: null, tipo: "subsistencia", nivel: "amarillo", titulo, mensaje: "m", fecha: hace(60), leida });
let avisos: ReturnType<typeof aviso>[];

function api() {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const clave = `${init.method ?? "GET"} ${url.replace("https://api.test", "")}`;
    if (clave === "GET /hogares") return respuestaJson([HOGAR]);
    if (clave === "GET /hogares/h1/alertas") return respuestaJson(avisos);
    if (clave === "GET /hogares/h1/preferencias-alertas") return respuestaJson({ sensibilidad: "normal" });
    if (clave === "DELETE /hogares/h1/alertas/leidas") {
      avisos = avisos.filter((a) => !a.leida);
      return { ok: true, status: 204, json: async () => undefined } as Response;
    }
    const uno = clave.match(/^DELETE \/hogares\/h1\/alertas\/(\w+)$/);
    if (uno) {
      avisos = avisos.filter((a) => a.id !== uno[1]);
      return { ok: true, status: 204, json: async () => undefined } as Response;
    }
    return respuestaJson({ detail: `sin simular ${clave}` }, 404);
  });
}
const borrados = () => fetchMock.mock.calls.filter(([, i]) => i?.method === "DELETE").map(([u]) => String(u).replace("https://api.test", ""));
/** Responde el diálogo de confirmación con el botón que diga `respuesta`. */
const responder = (respuesta: string) =>
  jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones?: AlertButton[]) => botones?.find((b) => b.text === respuesta)?.onPress?.());

beforeEach(async () => {
  avisos = [aviso("n1", "Sin leer todavía", false), aviso("v1", "Te acercas a la línea", true), aviso("v2", "Tu saldo se acaba", true)];
  fetchMock.mockReset();
  WebSocketFalso.instancias = [];
  useTiempoReal.setState({ conexion: "conectado", pushActivo: false });
  global.fetch = fetchMock as unknown as typeof fetch;
  (global as unknown as { WebSocket: unknown }).WebSocket = WebSocketFalso;
  await cerrarSesion();
  await iniciarSesionDePrueba();
  api();
});
afterEach(() => jest.restoreAllMocks());

describe("Eliminar avisos leídos", () => {
  it("cada aviso leído tiene su botón Eliminar, que pregunta antes y lo quita de la lista", async () => {
    const dialogo = responder("Eliminar");
    await renderizar(<Avisos />);
    await fireEvent.press(await screen.findByRole("button", { name: "Eliminar el aviso «Te acercas a la línea»" }));
    expect(dialogo).toHaveBeenCalledWith("¿Eliminar este aviso?", expect.stringContaining("«Te acercas a la línea» deja de verse aquí"), expect.any(Array), expect.anything());
    await waitFor(() => expect(screen.queryByText("Te acercas a la línea")).toBeNull());
    expect(borrados()).toEqual(["/hogares/h1/alertas/v1"]);
    expect(screen.getByText("Tu saldo se acaba")).toBeTruthy();
  });

  it("si cancela, no se borra nada", async () => {
    responder("Cancelar");
    await renderizar(<Avisos />);
    await fireEvent.press(await screen.findByRole("button", { name: "Eliminar el aviso «Tu saldo se acaba»" }));
    expect(borrados()).toEqual([]);
    expect(screen.getByText("Tu saldo se acaba")).toBeTruthy();
  });

  it("el lector de pantalla puede eliminar con su acción (no puede deslizar)", async () => {
    responder("Eliminar");
    await renderizar(<Avisos />);
    await screen.findByText("Tu saldo se acaba");
    const fila = screen.getByTestId("aviso-v2");
    expect(fila.props.accessibilityActions).toEqual([{ name: "eliminar", label: "Eliminar el aviso «Tu saldo se acaba»" }]);
    await fireEvent(fila, "accessibilityAction", { nativeEvent: { actionName: "eliminar" } });
    await waitFor(() => expect(borrados()).toEqual(["/hogares/h1/alertas/v2"]));
  });

  it("«Borrar todos» borra los leídos y deja los sin leer", async () => {
    const dialogo = responder("Borrar");
    await renderizar(<Avisos />);
    await fireEvent.press(await screen.findByRole("button", { name: "Borrar todos" }));
    expect(dialogo.mock.calls[0][0]).toBe("¿Borrar los 2 avisos leídos?");
    await waitFor(() => expect(screen.queryByText("Anteriores")).toBeNull());
    expect(borrados()).toEqual(["/hogares/h1/alertas/leidas"]);
    expect(screen.getByText("Sin leer todavía")).toBeTruthy();
  });

  it("los avisos sin leer no se pueden eliminar deslizando", async () => {
    await renderizar(<Avisos />);
    await screen.findByText("Sin leer todavía");
    expect(screen.queryByRole("button", { name: "Eliminar el aviso «Sin leer todavía»" })).toBeNull();
  });
});
