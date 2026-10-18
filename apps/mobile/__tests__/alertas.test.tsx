import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Notifications from "expo-notifications";

import { cerrarSesion } from "@/api/sesion";
import { mostrarAvisoLocal, registrarPush } from "@/features/alertas/notificaciones";
import { useTiempoReal } from "@/realtime/estado";
import { ProveedorTiempoReal } from "@/realtime/ProveedorTiempoReal";
import Avisos from "../app/(tabs)/avisos";

import { HOGAR, iniciarSesionDePrueba, renderizar, respuestaJson, WebSocketFalso } from "./auxiliares";

jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: "proyecto-eas" } } } } }));

const fetchMock = jest.fn();
const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const ROJO = { id: "a1", dispositivo_id: "d1", dispositivo_nombre: "Plancha", tipo: "alto_riesgo", nivel: "rojo", titulo: "La plancha lleva 45 minutos prendida", mensaje: "Es más de los 30 minutos que usted definió.", fecha: hace(20), leida: false };
const AMARILLO = { id: "a2", dispositivo_id: null, dispositivo_nombre: null, tipo: "subsistencia", nivel: "amarillo", titulo: "Se acerca a la línea de subsistencia", mensaje: "Ya va en el 85 %.", fecha: hace(60 * 26), leida: true };

type Ruta = unknown | ((init: RequestInit) => Response);
let estado: { avisos: unknown[]; sensibilidad: string };

function api(extra: Record<string, Ruta> = {}) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const clave = `${init.method ?? "GET"} ${url.replace("https://api.test", "")}`;
    const rutas: Record<string, Ruta> = {
      "GET /hogares": [HOGAR],
      "GET /hogares/h1/alertas": () => respuestaJson(estado.avisos),
      "GET /hogares/h1/preferencias-alertas": () => respuestaJson({ sensibilidad: estado.sensibilidad }),
      ...extra,
    };
    const r = rutas[clave];
    if (r === undefined) return respuestaJson({ detail: `sin simular ${clave}` }, 404);
    return typeof r === "function" ? (r as (i: RequestInit) => Response)(init) : respuestaJson(r);
  });
}
const llamadas = (metodo: string) => fetchMock.mock.calls.filter(([, i]) => i?.method === metodo).map(([u, i]) => [String(u).replace("https://api.test", ""), i.body ? JSON.parse(i.body) : undefined]);
const sinContenido = () => ({ ok: true, status: 204, json: async () => undefined }) as Response;

beforeEach(async () => {
  estado = { avisos: [ROJO, AMARILLO], sensibilidad: "normal" };
  fetchMock.mockReset();
  WebSocketFalso.instancias = [];
  (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  useTiempoReal.setState({ conexion: "conectado", pushActivo: false });
  global.fetch = fetchMock as unknown as typeof fetch;
  (global as unknown as { WebSocket: unknown }).WebSocket = WebSocketFalso;
  await cerrarSesion();
  await iniciarSesionDePrueba();
});

describe("Avisos", () => {
  it("lista los avisos con su título, cuándo pasó y cuáles no se han leído", async () => {
    api();
    await renderizar(<Avisos />);
    expect(await screen.findByText("La plancha lleva 45 minutos prendida")).toBeTruthy();
    expect(screen.getByText("Se acerca a la línea de subsistencia")).toBeTruthy();
    expect(screen.getByText("hace 20 min")).toBeTruthy();
    expect(screen.getByText("hace 26 h")).toBeTruthy();
    expect(screen.getAllByText("Nuevo")).toHaveLength(1); // solo el no leído
    expect(screen.getByText("Le contamos cuando algo se sale de lo normal.")).toBeTruthy();
  });

  it("sin avisos dice que todo está tranquilo", async () => {
    estado.avisos = [];
    api();
    await renderizar(<Avisos />);
    expect(await screen.findByText("Todo tranquilo")).toBeTruthy();
  });

  it("tocar un aviso lo marca como leído", async () => {
    api({ "POST /hogares/h1/alertas/a1/leida": sinContenido });
    await renderizar(<Avisos />);
    await fireEvent.press(await screen.findByText("La plancha lleva 45 minutos prendida"));
    await waitFor(() => expect(llamadas("POST").map((l) => l[0])).toContain("/hogares/h1/alertas/a1/leida"));
  });

  it("marcar todos como leídos", async () => {
    api({ "POST /hogares/h1/alertas/leidas": sinContenido });
    await renderizar(<Avisos />);
    await fireEvent.press(await screen.findByRole("button", { name: "Marcar el aviso como leído" }));
    await waitFor(() => expect(llamadas("POST").map((l) => l[0])).toContain("/hogares/h1/alertas/leidas"));
  });

  it("muestra la sensibilidad elegida y guarda el cambio", async () => {
    api({ "PUT /hogares/h1/preferencias-alertas": (init: RequestInit) => {
        estado.sensibilidad = JSON.parse(String(init.body)).sensibilidad; // el servidor guarda lo que le mandan
        return respuestaJson({ sensibilidad: estado.sensibilidad });
      },
    });
    await renderizar(<Avisos />);
    const normales = await screen.findByRole("radio", { name: /Normales/ });
    await waitFor(() => expect(normales.props.accessibilityState.checked).toBe(true));
    await fireEvent.press(screen.getByRole("radio", { name: /Muchas/ }));
    await waitFor(() => expect(llamadas("PUT")).toEqual([["/hogares/h1/preferencias-alertas", { sensibilidad: "todos" }]]));
    await waitFor(() => expect(screen.getByRole("radio", { name: /Muchas/ }).props.accessibilityState.checked).toBe(true));
    expect(screen.getByRole("radio", { name: /Normales/ }).props.accessibilityState.checked).toBe(false);
  });

  it("el aviso de alto riesgo trae el botón para apagar, y avisa cómo salió", async () => {
    api({ "POST /dispositivos/d1/apagar": () => respuestaJson({ dispositivo_id: "d1", encendido: false, via: "agente" }), "POST /hogares/h1/alertas/a1/leida": sinContenido });
    await renderizar(<Avisos />);
    await fireEvent.press(await screen.findByRole("button", { name: "Apagar ahora" }));
    expect(await screen.findByText("Listo, ya lo apagamos.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Apagar ahora" })).toHaveLength(1); // el aviso de subsistencia no tiene botón
  });

  it("si no se pudo apagar muestra el motivo", async () => {
    api({ "POST /dispositivos/d1/apagar": () => respuestaJson({ detail: "No se pudo apagar el dispositivo: no hay un agente conectado en tu casa." }, 503) });
    await renderizar(<Avisos />);
    await fireEvent.press(await screen.findByRole("button", { name: "Apagar ahora" }));
    expect(await screen.findByText(/no hay un agente conectado/)).toBeTruthy();
  });
});

describe("Aviso que llega en vivo", () => {
  const EVENTO = { tipo: "alerta", id: "a3", dispositivo_id: "d1", alerta_tipo: "alto_riesgo", nivel: "rojo", titulo: "El aire lleva 6 horas prendido", mensaje: "Apáguelo.", fecha: new Date().toISOString() };

  async function abrirConConexion() {
    api();
    await renderizar(
      <>
        <ProveedorTiempoReal hogarId="h1" />
        <Avisos />
      </>,
    );
    await screen.findByText("La plancha lleva 45 minutos prendida");
    await waitFor(() => expect(WebSocketFalso.instancias).toHaveLength(1));
    await waitFor(() => expect(WebSocketFalso.instancias[0].enviados).toHaveLength(1));
    return WebSocketFalso.instancias[0];
  }

  it("aparece en la lista sin recargar", async () => {
    const ws = await abrirConConexion();
    estado.avisos = [{ ...ROJO, id: "a3", titulo: EVENTO.titulo, fecha: hace(0) }, ROJO, AMARILLO]; // lo que devolverá el servidor al refrescar
    await act(async () => ws.emitir(EVENTO));
    expect(await screen.findByText("El aire lleva 6 horas prendido")).toBeTruthy();
  });

  it("con permiso, además sale como notificación del sistema", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });
    const ws = await abrirConConexion();
    await act(async () => ws.emitir(EVENTO));
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
    const { content, identifier } = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(identifier).toBe("a3");
    expect(content).toMatchObject({ title: "El aire lleva 6 horas prendido", body: "Apáguelo.", categoryIdentifier: "aviso_con_apagar" });
    expect(content.data.dispositivo_id).toBe("d1");
  });

  it("sin permiso no molesta con una notificación", async () => {
    const ws = await abrirConConexion();
    await act(async () => ws.emitir(EVENTO));
    await screen.findByText("La plancha lleva 45 minutos prendida");
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe("Notificaciones", () => {
  const EVENTO = { tipo: "alerta" as const, id: "x", dispositivo_id: null, alerta_tipo: "subsistencia", nivel: "amarillo" as const, titulo: "t", mensaje: "m", fecha: "f" };

  it("si el push remoto ya está activo no duplica con una notificación local", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    useTiempoReal.setState({ pushActivo: true });
    await mostrarAvisoLocal(EVENTO);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("registra el token de Expo en la API cuando hay permiso y proyecto", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    api({ "PUT /usuarios/yo/tokens-push": sinContenido });
    expect(await registrarPush()).toBe(true);
    expect(llamadas("PUT")[0][1]).toEqual({ token: "ExponentPushToken[prueba]", plataforma: expect.stringMatching(/android|ios/) });
    expect(useTiempoReal.getState().pushActivo).toBe(true);
  });

  it("sin permiso o sin push disponible no es un error", async () => {
    expect(await registrarPush()).toBe(false); // permiso negado
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValueOnce(new Error("Expo Go no soporta push en Android"));
    expect(await registrarPush()).toBe(false);
    expect(useTiempoReal.getState().pushActivo).toBe(false);
  });
});
