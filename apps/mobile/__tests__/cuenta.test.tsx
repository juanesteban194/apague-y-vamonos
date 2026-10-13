import { createHash } from "crypto";

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";

import { pasoDeNavegacion } from "@/api/cuenta";
import { cerrarSesion, useSesion } from "@/api/sesion";
import { haceCuanto } from "@/lib/fechas";
import VincularAgente from "../app/agente/nuevo";
import Login from "../app/(auth)/login";
import Registro from "../app/(auth)/registro";
import Consentimiento from "../app/(onboarding)/consentimiento";
import CrearHogar from "../app/(onboarding)/hogar";
import EditarEnchufe from "../app/enchufe/[id]";
import NuevoEnchufe from "../app/enchufe/nuevo";
import MiCasa from "../app/(tabs)/mi-casa";

import { HOGAR, iniciarSesionDePrueba, jwtFalso, renderizar, respuestaJson, RESUMEN, TARIFA } from "./auxiliares";

const fetchMock = jest.fn();
const abrirNavegador = WebBrowser.openAuthSessionAsync as jest.Mock;
const PERFIL = { id: "u1", email: "ana@example.com", nombre: "Ana Pérez", tiene_consentimiento: true, tiene_contrasena: true, tiene_google: false };
const TOKENS = () => ({ access_token: jwtFalso(), refresh_token: jwtFalso(86400), token_type: "bearer" });
const ENCHUFE = { id: "d1", tuya_id: "eb182b7a119cf6aaeecf66", nombre: "Nevera", tipo_aparato: null, alto_riesgo: false, umbral_minutos_encendido: null };

/** API simulada: rutas exactas con su respuesta; lo demás da 404. Guarda lo enviado en `llamadas`. */
function simular(rutas: Record<string, unknown | ((init: RequestInit) => Response)>) {
  fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
    const clave = `${init.method ?? "GET"} ${url.replace("https://api.test", "")}`;
    const r = rutas[clave];
    if (r === undefined) return respuestaJson({ detail: `sin simular ${clave}` }, 404);
    return typeof r === "function" ? (r as (i: RequestInit) => Response)(init) : respuestaJson(r);
  });
}
const enviado = (clave: string) => {
  const llamada = fetchMock.mock.calls.find(([u, i]) => `${i?.method ?? "GET"} ${String(u).replace("https://api.test", "")}` === clave);
  return llamada ? JSON.parse(llamada[1].body ?? "null") : undefined;
};

beforeEach(async () => {
  fetchMock.mockReset();
  abrirNavegador.mockReset();
  (Clipboard.setStringAsync as jest.Mock).mockClear();
  (router.push as jest.Mock).mockClear();
  (globalThis as { __parametros?: object }).__parametros = {};
  global.fetch = fetchMock as unknown as typeof fetch;
  await cerrarSesion();
});

describe("qué pantalla toca", () => {
  const hogar = [HOGAR];
  it.each([
    [{ autenticado: false, perfil: undefined, hogares: undefined }, "sesion"],
    [{ autenticado: true, perfil: undefined, hogares: undefined }, "cargando"],
    [{ autenticado: true, perfil: { ...PERFIL, tiene_consentimiento: false }, hogares: undefined }, "consentimiento"],
    [{ autenticado: true, perfil: PERFIL, hogares: undefined }, "cargando"],
    [{ autenticado: true, perfil: PERFIL, hogares: [] }, "hogar"],
    [{ autenticado: true, perfil: PERFIL, hogares: hogar }, "lista"],
  ])("%j → %s", (args, esperado) => expect(pasoDeNavegacion(args as never)).toBe(esperado));

  it("sin consentimiento no se pasa a nada más, aunque ya haya hogares", () => {
    expect(pasoDeNavegacion({ autenticado: true, perfil: { ...PERFIL, tiene_consentimiento: false } as never, hogares: hogar })).toBe("consentimiento");
  });
});

describe("Google", () => {
  function navegadorAprueba(extra: Record<string, string> = {}) {
    abrirNavegador.mockImplementation(async (url: string, volverA: string) => {
      const q = new URL(url).searchParams;
      return { type: "success", url: `${volverA}?code=CODIGO-UN-USO&state=${extra.state ?? q.get("state")}` };
    });
  }

  it("abre el navegador con el reto PKCE y canjea el código con el verificador (que nunca viaja en la URL)", async () => {
    navegadorAprueba();
    simular({ "POST /auth/google/canje": TOKENS() });
    await renderizar(<Login />);
    await fireEvent.press(screen.getByRole("button", { name: "Continuar con Google" }));

    await waitFor(() => expect(useSesion.getState().refreshToken).not.toBeNull());
    const url = new URL(abrirNavegador.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://api.test/auth/google/inicio");
    expect(url.searchParams.get("redirect_uri")).toBe("exp://127.0.0.1:8081/--/auth-google");

    const canje = enviado("POST /auth/google/canje");
    expect(canje.code).toBe("CODIGO-UN-USO");
    expect(canje.code_verifier).toHaveLength(43);
    // El reto que se mandó a la API es el SHA-256 (base64url) del verificador que se usa al canjear.
    const reto = createHash("sha256").update(canje.code_verifier).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(url.searchParams.get("code_challenge")).toBe(reto);
    expect(url.toString()).not.toContain(canje.code_verifier);
  });

  it("si la persona cierra el navegador no hay error ni sesión", async () => {
    abrirNavegador.mockResolvedValue({ type: "cancel" });
    await renderizar(<Login />);
    await fireEvent.press(screen.getByRole("button", { name: "Continuar con Google" }));
    await waitFor(() => expect(abrirNavegador).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(useSesion.getState().refreshToken).toBeNull();
  });

  it("rechaza una respuesta con otro state (posible ataque)", async () => {
    navegadorAprueba({ state: "otro-state" });
    await renderizar(<Login />);
    await fireEvent.press(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(await screen.findByText(/La respuesta de Google no es válida/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si Google falla muestra un mensaje y ofrece el correo", async () => {
    abrirNavegador.mockImplementation(async (url: string, volverA: string) => ({
      type: "success",
      url: `${volverA}?error=google_fallo&state=${new URL(url).searchParams.get("state")}`,
    }));
    await renderizar(<Login />);
    await fireEvent.press(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(await screen.findByText(/No se pudo entrar con Google/)).toBeTruthy();
  });

  it("si el canje falla (código vencido o repetido) lo dice", async () => {
    navegadorAprueba();
    simular({ "POST /auth/google/canje": () => respuestaJson({ detail: "x" }, 400) });
    await renderizar(<Login />);
    await fireEvent.press(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(await screen.findByText(/No se pudo completar el inicio de sesión con Google/)).toBeTruthy();
    expect(useSesion.getState().refreshToken).toBeNull();
  });
});

describe("Registro", () => {
  async function llenar(consentimiento = true) {
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana Pérez");
    await fireEvent.changeText(screen.getByLabelText("Correo"), "ana@example.com");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "clave-segura-1");
    if (consentimiento) await fireEvent.press(screen.getByRole("checkbox"));
  }
  const crear = () => screen.getByRole("button", { name: "Crear cuenta" });

  it("no deja crear la cuenta sin aceptar el tratamiento de datos", async () => {
    await renderizar(<Registro />);
    await llenar(false);
    expect(crear().props.accessibilityState.disabled).toBe(true);
    expect(await screen.findByText("Debes aceptar el tratamiento de datos para crear la cuenta.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("checkbox"));
    expect(crear().props.accessibilityState.disabled).toBe(false);
  });

  it("valida correo y contraseña antes de enviar", async () => {
    await renderizar(<Registro />);
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Ana");
    await fireEvent.changeText(screen.getByLabelText("Correo"), "no-es-correo");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "corta");
    await fireEvent.press(screen.getByRole("checkbox"));
    expect(crear().props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText("Escribe un correo válido.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Correo"), "ana@example.com");
    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeTruthy();
  });

  it("crea la cuenta con el consentimiento y entra", async () => {
    simular({ "POST /auth/registro": () => respuestaJson({ id: "u1" }, 201), "POST /auth/login": TOKENS() });
    await renderizar(<Registro />);
    await llenar();
    await fireEvent.press(crear());
    await waitFor(() => expect(useSesion.getState().refreshToken).not.toBeNull());
    expect(enviado("POST /auth/registro")).toEqual({ nombre: "Ana Pérez", email: "ana@example.com", contrasena: "clave-segura-1", acepta_tratamiento_datos: true });
  });

  it("avisa si el correo ya tiene cuenta", async () => {
    simular({ "POST /auth/registro": () => respuestaJson({ detail: "Ese correo ya está registrado" }, 409) });
    await renderizar(<Registro />);
    await llenar();
    await fireEvent.press(crear());
    expect(await screen.findByText(/Ese correo ya tiene una cuenta/)).toBeTruthy();
    expect(useSesion.getState().refreshToken).toBeNull();
  });
});

describe("Consentimiento y hogar", () => {
  it("acepta el tratamiento de datos", async () => {
    await iniciarSesionDePrueba();
    simular({
      "GET /auth/yo": { ...PERFIL, tiene_consentimiento: false },
      "POST /auth/consentimiento": PERFIL,
    });
    await renderizar(<Consentimiento />);
    expect(await screen.findByText("Hola, Ana")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Acepto y continuar" }));
    await waitFor(() => expect(enviado("POST /auth/consentimiento")).toBeDefined());
  });

  it("'No acepto' cierra la sesión", async () => {
    await iniciarSesionDePrueba();
    simular({ "GET /auth/yo": { ...PERFIL, tiene_consentimiento: false } });
    await renderizar(<Consentimiento />);
    await fireEvent.press(screen.getByRole("button", { name: "No acepto, salir" }));
    await waitFor(() => expect(useSesion.getState().refreshToken).toBeNull());
  });

  it("crea el hogar con estrato y medidor", async () => {
    await iniciarSesionDePrueba();
    simular({ "POST /hogares": () => respuestaJson(HOGAR, 201) });
    await renderizar(<CrearHogar />);
    const crear = () => screen.getByRole("button", { name: "Crear hogar" });
    expect(crear().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText("Nombre del hogar"), "Casa de Ana");
    await fireEvent.press(screen.getByRole("button", { name: "3" }));
    await fireEvent.press(screen.getByRole("button", { name: "Prepago" }));
    expect(crear().props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(crear());
    await waitFor(() => expect(enviado("POST /hogares")).toEqual({ nombre: "Casa de Ana", barrio: null, estrato: 3, tipo_medidor: "prepago" }));
  });
});

describe("Mi casa", () => {
  const PREPAGO = { estado: "sin_registros", saldo_cop: null, registrado_en: null, promedio_diario_cop: null, dias_restantes: null, se_acaba_el: null, nivel: null, registros: [] };
  const RUTINA = { id: "r1", dispositivo_id: "d1", dispositivo_nombre: "Nevera", dias: [0, 1, 2, 3, 4], hora_apagado: "22:00:00", hora_encendido: "06:00:00", activa: true, ahorro_estimado_cop_mes: 14118.6, ultima_ejecucion: null };
  const base = {
    "GET /auth/yo": PERFIL,
    "GET /hogares": [HOGAR],
    "GET /hogares/h1/tarifa": TARIFA,
    "GET /hogares/h1/dispositivos": [ENCHUFE],
    "GET /hogares/h1/resumen": RESUMEN,
    "GET /hogares/h1/prepago": PREPAGO,
    "GET /hogares/h1/rutinas": [],
    "GET /hogares/h1/agentes": [],
  };

  it("muestra el hogar con sus datos, como en el mockup", async () => {
    await iniciarSesionDePrueba();
    simular(base);
    await renderizar(<MiCasa />);
    expect(await screen.findByText("Casa demo")).toBeTruthy();
    expect(screen.getByText("CD")).toBeTruthy(); // iniciales en el avatar
    expect(await screen.findByText("$814,63 por kWh")).toBeTruthy();
    expect(screen.getByText(/Tarifa EPM de septiembre de 2026 \(falta cargar la de este mes\)/)).toBeTruthy();
    expect(screen.getByText("Sin indicar")).toBeTruthy();
    expect(await screen.findByText(/ana@example.com/)).toBeTruthy();
  });

  it("lista los enchufes con su estado y cuántos están conectados", async () => {
    await iniciarSesionDePrueba();
    simular({
      ...base,
      "GET /hogares/h1/dispositivos": [ENCHUFE, { ...ENCHUFE, id: "d2", nombre: "Pasillo" }],
      "GET /hogares/h1/resumen": { ...RESUMEN, dispositivos: [...RESUMEN.dispositivos, { ...RESUMEN.dispositivos[0], id: "d2", en_linea: false, ultima_lectura: new Date(Date.now() - 2 * 3600_000).toISOString() }] },
    });
    await renderizar(<MiCasa />);
    expect(await screen.findByText("1 de 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nevera · Conectado" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pasillo · Sin señal desde hace 2 h" })).toBeTruthy();
  });

  it("el prepago aparece si el medidor es prepago y muestra el saldo y hasta cuándo alcanza", async () => {
    await iniciarSesionDePrueba();
    const se_acaba_el = new Date(Date.now() + 8 * 86_400_000).toISOString();
    simular({
      ...base,
      "GET /hogares": [{ ...HOGAR, tipo_medidor: "prepago" }],
      "GET /hogares/h1/prepago": { ...PREPAGO, estado: "ok", saldo_cop: 28500, promedio_diario_cop: 3500, dias_restantes: 8, se_acaba_el, nivel: "verde" },
    });
    await renderizar(<MiCasa />);
    expect(await screen.findByText("$28.500")).toBeTruthy();
    expect(screen.getByText(/le alcanza hasta el .* Son unos 8 días\./)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Actualizar saldo" }));
    expect(router.push).toHaveBeenCalledWith("/prepago");
  });

  it("con medidor pospago no muestra el prepago", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares": [{ ...HOGAR, tipo_medidor: "pospago" }] });
    await renderizar(<MiCasa />);
    await screen.findByText("Casa demo");
    expect(screen.queryByText(/Medidor prepago/)).toBeNull();
  });

  it("el prepago a punto de acabarse se ve en rojo y lo dice", async () => {
    await iniciarSesionDePrueba();
    simular({
      ...base,
      "GET /hogares": [{ ...HOGAR, tipo_medidor: "prepago" }],
      "GET /hogares/h1/prepago": { ...PREPAGO, estado: "ok", saldo_cop: 5000, promedio_diario_cop: 3333, dias_restantes: 1.5, se_acaba_el: new Date(Date.now() + 36 * 3600_000).toISOString(), nivel: "rojo" },
    });
    await renderizar(<MiCasa />);
    expect(await screen.findByText("MEDIDOR PREPAGO · SE ACABA PRONTO".toLowerCase().replace("medidor", "Medidor"))).toBeTruthy();
  });

  it("lista las rutinas con su horario, días y ahorro estimado", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/rutinas": [RUTINA] });
    await renderizar(<MiCasa />);
    expect(await screen.findByText("Apaga a las 22:00 · prende a las 06:00")).toBeTruthy();
    expect(screen.getByText("Lun a Vie")).toBeTruthy();
    expect(screen.getByText("Ahorra unos $14.119 al mes")).toBeTruthy();
  });

  it("agente que nunca se ha conectado", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [{ id: "a1", nombre: "Mac", ultima_conexion: null, creado_en: "2026-10-12T00:00:00Z" }] });
    await renderizar(<MiCasa />);
    expect(await screen.findByText(/Mac:.*nunca se ha conectado/)).toBeTruthy();
  });

  it("agente conectado hace segundos", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [{ id: "a1", nombre: "Mac", ultima_conexion: new Date().toISOString(), creado_en: "2026-10-12T00:00:00Z" }] });
    await renderizar(<MiCasa />);
    expect(await screen.findByText(/Mac:.*conectado/)).toBeTruthy();
  });

  it("sin agente avisa que no llegarán datos", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/dispositivos": [] });
    await renderizar(<MiCasa />);
    expect(await screen.findByText(/Sin agente vinculado/)).toBeTruthy();
    expect(await screen.findByText("Aún no has agregado enchufes.")).toBeTruthy();
  });

  it("cada botón lleva a su pantalla", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/rutinas": [RUTINA] });
    await renderizar(<MiCasa />);
    const pulsar = async (nombre: string | RegExp) => fireEvent.press(await screen.findByRole("button", { name: nombre }));
    await pulsar("Editar hogar");
    await pulsar("Nueva rutina");
    await pulsar(/^Nevera · /);
    await pulsar("+ Conectar otro enchufe");
    await pulsar("Vincular agente");
    await pulsar("Anotar lectura del medidor");
    await pulsar(/^Nevera\. Apaga a las 22:00/);
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["/hogar/editar", "/rutina/nueva", "/enchufe/d1", "/enchufe/nuevo", "/agente/nuevo", "/medidor", "/rutina/r1"]);
  });
});

describe("Enchufes", () => {
  const base = { "GET /hogares": [HOGAR], "GET /hogares/h1/dispositivos": [ENCHUFE] };

  it("agrega un enchufe con su ID de Tuya y el aviso de alto riesgo", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "POST /hogares/h1/dispositivos": () => respuestaJson(ENCHUFE, 201) });
    await renderizar(<NuevoEnchufe />);
    const agregar = async () => screen.getByRole("button", { name: "Agregar" });
    await waitFor(async () => expect(await agregar()).toBeTruthy());
    expect((await agregar()).props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Plancha");
    await fireEvent.changeText(screen.getByLabelText("ID del dispositivo en Tuya"), "  abc123  ");
    await fireEvent.press(screen.getByRole("checkbox"));
    await fireEvent.changeText(screen.getByLabelText("Minutos encendido antes de avisar"), "45");
    await fireEvent.press(await agregar());
    await waitFor(() =>
      expect(enviado("POST /hogares/h1/dispositivos")).toEqual({ tuya_id: "abc123", nombre: "Plancha", tipo_aparato: null, alto_riesgo: true, umbral_minutos_encendido: 45 }),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it("minutos inválidos bloquean el guardado", async () => {
    await iniciarSesionDePrueba();
    simular(base);
    await renderizar(<NuevoEnchufe />);
    await screen.findByLabelText("Nombre");
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Plancha");
    await fireEvent.changeText(screen.getByLabelText("ID del dispositivo en Tuya"), "abc");
    await fireEvent.press(screen.getByRole("checkbox"));
    await fireEvent.changeText(screen.getByLabelText("Minutos encendido antes de avisar"), "0");
    expect(screen.getByRole("button", { name: "Agregar" }).props.accessibilityState.disabled).toBe(true);
  });

  it("si el ID de Tuya ya está registrado muestra el error del servidor", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "POST /hogares/h1/dispositivos": () => respuestaJson({ detail: "Ese ID de Tuya ya está registrado" }, 409) });
    await renderizar(<NuevoEnchufe />);
    await screen.findByLabelText("Nombre");
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "X");
    await fireEvent.changeText(screen.getByLabelText("ID del dispositivo en Tuya"), "abc");
    await fireEvent.press(screen.getByRole("button", { name: "Agregar" }));
    expect(await screen.findByText("Ese ID de Tuya ya está registrado")).toBeTruthy();
  });

  it("edita un enchufe sin dejar cambiar su ID de Tuya", async () => {
    await iniciarSesionDePrueba();
    (globalThis as { __parametros?: object }).__parametros = { id: "d1" };
    simular({ ...base, "PATCH /hogares/h1/dispositivos/d1": () => respuestaJson({ ...ENCHUFE, nombre: "Nevera nueva" }) });
    await renderizar(<EditarEnchufe />);
    const id = await screen.findByLabelText("ID del dispositivo en Tuya");
    expect(id.props.editable).toBe(false);
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Nevera nueva");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(enviado("PATCH /hogares/h1/dispositivos/d1")).toEqual({ nombre: "Nevera nueva", tipo_aparato: null, alto_riesgo: false, umbral_minutos_encendido: null }));
  });

  it("quitar un enchufe pide confirmación y avisa que borra el historial", async () => {
    await iniciarSesionDePrueba();
    (globalThis as { __parametros?: object }).__parametros = { id: "d1" };
    simular({ ...base, "DELETE /hogares/h1/dispositivos/d1": () => ({ ok: true, status: 204, json: async () => undefined }) as Response });
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderizar(<EditarEnchufe />);
    await fireEvent.press(await screen.findByRole("button", { name: "Quitar enchufe" }));

    const [titulo, mensaje, botones] = alerta.mock.calls[0];
    expect(titulo).toContain("Nevera");
    expect(mensaje).toContain("historial");
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false); // aún no se borró nada
    await act(async () => {
      await botones!.find((b) => b.style === "destructive")!.onPress!();
    });
    expect(fetchMock.mock.calls.some(([u, i]) => i?.method === "DELETE" && String(u).endsWith("/dispositivos/d1"))).toBe(true);
  });
});

describe("Agente", () => {
  it("muestra la clave una sola vez, lista para copiar con la URL de la API", async () => {
    await iniciarSesionDePrueba();
    simular({ "GET /hogares": [HOGAR], "POST /hogares/h1/agentes": () => respuestaJson({ id: "a1", nombre: "Computador de la casa", token: "TOKEN-SECRETO-123" }, 201) });
    await renderizar(<VincularAgente />);
    await fireEvent.press(await screen.findByRole("button", { name: "Crear clave del agente" }));

    expect(await screen.findByText("Se muestra una sola vez. Si lo pierdes, crea otra clave.")).toBeTruthy();
    const configuracion = "AGENT_API_URL=https://api.test\nAGENT_TOKEN=TOKEN-SECRETO-123";
    expect(screen.getByText(configuracion)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Copiar" }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(configuracion);
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeTruthy();
  });
});

it("haceCuanto", () => {
  const ahora = Date.parse("2026-10-12T12:00:00Z");
  expect(haceCuanto("2026-10-12T11:59:40Z", ahora)).toBe("hace instantes");
  expect(haceCuanto("2026-10-12T11:50:00Z", ahora)).toBe("hace 10 min");
  expect(haceCuanto("2026-10-12T07:00:00Z", ahora)).toBe("hace 5 h");
  expect(haceCuanto("2026-10-08T12:00:00Z", ahora)).toBe("hace 4 días");
});
