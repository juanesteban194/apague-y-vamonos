import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { cerrarSesion, useSesion } from "@/api/sesion";
import Login from "../app/(auth)/login";
import Dispositivo from "../app/dispositivo/[id]";
import Inicio from "../app/(tabs)/index";
import { ProveedorTiempoReal } from "@/realtime/ProveedorTiempoReal";

import { CONSUMO_DIA, HOGAR, iniciarSesionDePrueba, jwtFalso, renderizar, respuestaJson, RESUMEN, WebSocketFalso } from "./auxiliares";

const fetchMock = jest.fn();

function simularApi(extra: Record<string, unknown> = {}) {
  fetchMock.mockImplementation(async (url: string) => {
    const ruta = url.replace("https://api.test", "");
    for (const [prefijo, cuerpo] of Object.entries({
      "/hogares/h1/resumen": RESUMEN,
      "/dispositivos/d1/consumo?periodo=dia": CONSUMO_DIA,
      "/hogares": [HOGAR],
      ...extra,
    })) {
      if (ruta === prefijo) return respuestaJson(cuerpo);
    }
    return respuestaJson({ detail: `sin simular ${ruta}` }, 404);
  });
}

beforeEach(async () => {
  (globalThis as { __parametros?: object }).__parametros = { id: "d1" };
  fetchMock.mockReset();
  WebSocketFalso.instancias = [];
  global.fetch = fetchMock as unknown as typeof fetch;
  (global as unknown as { WebSocket: unknown }).WebSocket = WebSocketFalso;
  await cerrarSesion();
});

describe("Inicio", () => {
  it("muestra el costo de hoy en pesos y el dispositivo, sin kWh", async () => {
    await iniciarSesionDePrueba();
    simularApi();
    await renderizar(<Inicio />);

    expect(await screen.findByText("Casa demo")).toBeTruthy();
    expect((await screen.findAllByText("$8,15")).length).toBeGreaterThanOrEqual(2); // total y tarjeta del dispositivo
    expect(screen.getByText("Enchufe BSD04")).toBeTruthy();
    expect(screen.getByText(/27 W ahora/)).toBeTruthy();
    expect(screen.getByText("Con la tarifa de septiembre de 2026.")).toBeTruthy();
    expect(screen.queryByText(/kWh/)).toBeNull(); // CLAUDE.md: no mostrar kWh fuera de configuración
  });

  it("autentica el WebSocket en el primer mensaje y actualiza la potencia en vivo", async () => {
    await iniciarSesionDePrueba();
    simularApi();
    await renderizar(
      <>
        <ProveedorTiempoReal hogarId="h1" />
        <Inicio />
      </>,
    );

    await waitFor(() => expect(WebSocketFalso.instancias).toHaveLength(1)); // una sola conexión para toda la app
    const ws = WebSocketFalso.instancias[0];
    expect(ws.url).toBe("wss://api.test/ws/hogares/h1");
    await waitFor(() => expect(ws.enviados).toHaveLength(1));
    expect(JSON.parse(ws.enviados[0])).toEqual({ token: useSesion.getState().accessToken });
    expect(ws.url).not.toContain(String(useSesion.getState().accessToken)); // el token no va en la URL

    expect(await screen.findByText("Conectando en vivo…")).toBeTruthy();
    await act(async () => ws.emitir({ tipo: "conectado" }));
    expect(screen.queryByText("Conectando en vivo…")).toBeNull();

    // El servidor ya tiene esa lectura: el recálculo de costos que dispara el evento la trae de vuelta.
    simularApi({ "/hogares/h1/resumen": { ...RESUMEN, dispositivos: [{ ...RESUMEN.dispositivos[0], potencia_w: 12.3 }] } });
    await act(async () =>
      ws.emitir({ tipo: "lectura", dispositivo_id: "d1", fecha_hora: "2026-10-12T15:00:05Z", potencia_w: 12.3, voltaje_v: 128, corriente_ma: 100, encendido: true }),
    );
    expect(await screen.findByText(/12 W ahora/)).toBeTruthy();
  });

  it("avisa cuando el dato llega con retraso", async () => {
    await iniciarSesionDePrueba();
    simularApi({ "/hogares/h1/resumen": { ...RESUMEN, dispositivos: [{ ...RESUMEN.dispositivos[0], en_linea: false }] } });
    await renderizar(<Inicio />);
    expect(await screen.findByText("Dato con retraso")).toBeTruthy();
  });

  it("sin tarifa no inventa costos", async () => {
    await iniciarSesionDePrueba();
    simularApi({
      "/hogares/h1/resumen": {
        ...RESUMEN, tarifa: null, costo_hoy_cop: null, costo_mes_cop: null,
        dispositivos: [{ ...RESUMEN.dispositivos[0], costo_hoy_cop: null, costo_mes_cop: null }],
      },
    });
    await renderizar(<Inicio />);
    expect(await screen.findByText(/Aún no hay tarifa cargada/)).toBeTruthy();
    expect(screen.queryByText("$0,00")).toBeNull();
  });

  it("si la API falla muestra el error y cómo reintentar", async () => {
    await iniciarSesionDePrueba();
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await renderizar(<Inicio />);
    expect(await screen.findByText("No hay conexión con el servidor")).toBeTruthy();
    expect(screen.getByText("Desliza hacia abajo para reintentar.")).toBeTruthy();
  });
});

describe("Dispositivo", () => {
  it("muestra estado, potencia, costos y el gráfico del día", async () => {
    await iniciarSesionDePrueba();
    simularApi();
    await renderizar(<Dispositivo />);

    expect(await screen.findByText("Encendido")).toBeTruthy();
    expect(await screen.findByText("27 W")).toBeTruthy();
    expect((await screen.findAllByText("$8,15")).length).toBeGreaterThanOrEqual(3); // hoy, mes y total del periodo
    expect(await screen.findByText("Hoy")).toBeTruthy();
    expect(screen.getByText("Costo en pesos por hora.")).toBeTruthy();
    expect(screen.queryByText(/kWh/)).toBeNull();
  });

  it("al cambiar a Semana pide ese periodo", async () => {
    await iniciarSesionDePrueba();
    simularApi({ "/dispositivos/d1/consumo?periodo=semana": { ...CONSUMO_DIA, periodo: "semana", serie: CONSUMO_DIA.serie.slice(0, 7).map((p, i) => ({ ...p, inicio: `2026-10-${12 + i}T00:00:00-05:00` })) } });
    await renderizar(<Dispositivo />);
    await screen.findByText("Hoy");
    await fireEvent.press(screen.getByText("Semana"));
    expect(await screen.findByText("Últimos 7 días")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("periodo=semana"))).toBe(true);
  });
});

describe("Login", () => {
  it("el botón queda deshabilitado hasta tener correo y contraseña, y entra con ellos", async () => {
    fetchMock.mockResolvedValueOnce(respuestaJson({ access_token: jwtFalso(), refresh_token: jwtFalso(86400), token_type: "bearer" }));
    await renderizar(<Login />);

    const boton = screen.getByRole("button", { name: "Entrar" });
    expect(boton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText("Correo"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "clave-segura-1");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(useSesion.getState().refreshToken).not.toBeNull());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "ana@example.com", contrasena: "clave-segura-1" });
  });

  it("muestra el error si las credenciales son malas", async () => {
    fetchMock.mockResolvedValueOnce(respuestaJson({ detail: "x" }, 401));
    await renderizar(<Login />);
    await fireEvent.changeText(screen.getByLabelText("Correo"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "mala");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Correo o contraseña incorrectos")).toBeTruthy();
  });
});
