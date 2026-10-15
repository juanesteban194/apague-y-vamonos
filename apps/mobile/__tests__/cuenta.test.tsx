import { createHash } from "crypto";

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";

import { pasoDeNavegacion } from "@/api/cuenta";
import { cerrarSesion, useSesion } from "@/api/sesion";
import { BotonAyuda } from "@/components/BotonAyuda";
import { SelectorCasa } from "@/components/SelectorCasa";
import { SugerenciaAyuda } from "@/components/SugerenciaAyuda";
import { elegirCasa, useCasaSeleccionada } from "@/features/casas/seleccion";
import { reiniciarAyuda, useAyudaVista } from "@/features/ayuda/estado";
import { ORDEN_TEMAS, TEMAS } from "@/features/ayuda/temas";
import { CONTACTO, POLITICA } from "@/features/datos/politica";
import { haceCuanto } from "@/lib/fechas";
import VincularAgente from "../app/agente/nuevo";
import Login from "../app/(auth)/login";
import Registro from "../app/(auth)/registro";
import Consentimiento from "../app/(onboarding)/consentimiento";
import CrearHogar from "../app/(onboarding)/hogar";
import EditarEnchufe from "../app/enchufe/[id]";
import NuevoEnchufe from "../app/enchufe/nuevo";
import Ajustes from "../app/(tabs)/ajustes";
import Explorar from "../app/(tabs)/explorar";
import Inicio from "../app/(tabs)/index";
import Agentes from "../app/agentes";
import PantallaAyuda from "../app/ayuda/[tema]";
import NuevaCasa from "../app/casa/nueva";
import Casas from "../app/casas";
import EliminarCuenta from "../app/eliminar-cuenta";
import Medidor from "../app/medidor";
import Politica from "../app/politica";
import Enchufes from "../app/enchufes";
import Facturas from "../app/facturas";
import Instrucciones from "../app/instrucciones";
import Rutinas from "../app/rutinas";

import { clienteDePrueba, HOGAR, iniciarSesionDePrueba, jwtFalso, renderizar, respuestaJson, RESUMEN, TARIFA } from "./auxiliares";

const fetchMock = jest.fn();
const abrirNavegador = WebBrowser.openAuthSessionAsync as jest.Mock;
const PERFIL = { id: "u1", email: "ana@example.com", nombre: "Ana Pérez", tiene_consentimiento: true, tiene_contrasena: true, tiene_google: false };
const TOKENS = () => ({ access_token: jwtFalso(), refresh_token: jwtFalso(86400), token_type: "bearer" });
const AGENTE = { id: "a1", nombre: "Sala", ultima_conexion: new Date().toISOString(), creado_en: "2026-10-12T00:00:00Z", vinculado: true, conectado: true, enchufes: [] as { id: string; nombre: string }[] };
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
  useCasaSeleccionada.setState({ id: null });
  useAyudaVista.setState({ cargada: true, vistas: [...ORDEN_TEMAS] }); // sin sugerencias de primera vez, salvo en las pruebas de ayuda
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

describe("Categorías de la casa", () => {
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

  it("Casas: muestra la casa con sus datos, como en el mockup", async () => {
    await iniciarSesionDePrueba();
    simular(base);
    await renderizar(<Casas />);
    expect(await screen.findByText("Datos de Casa demo")).toBeTruthy();
    expect(await screen.findByText("$814,63 por kWh")).toBeTruthy();
    expect(screen.getByText(/Tarifa EPM de septiembre de 2026 \(falta cargar la de este mes\)/)).toBeTruthy();
    expect(screen.getByText("Sin indicar")).toBeTruthy();
  });

  it("Casas: con varias casas se elige cuál ver y los datos cambian", async () => {
    await iniciarSesionDePrueba();
    const otra = { ...HOGAR, id: "h2", nombre: "Casa de los papás", estrato: 2 };
    simular({ ...base, "GET /hogares": [HOGAR, otra], "GET /hogares/h2/tarifa": { ...TARIFA, estrato: 2 } });
    await renderizar(<Casas />);
    expect(await screen.findByText("Datos de Casa demo")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /Casa de los papás/ }));
    expect(await screen.findByText("Datos de Casa de los papás")).toBeTruthy();
    expect(useCasaSeleccionada.getState().id).toBe("h2");
    await fireEvent.press(screen.getByRole("button", { name: "Agregar otra casa" }));
    await fireEvent.press(screen.getByRole("button", { name: "Editar esta casa" }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["/casa/nueva", "/hogar/editar"]);
  });

  it("Casas: una casa elegida que ya no existe vuelve a la primera", async () => {
    await iniciarSesionDePrueba();
    await elegirCasa("borrada");
    simular(base);
    await renderizar(<Casas />);
    expect(await screen.findByText("Datos de Casa demo")).toBeTruthy();
  });

  it("Nueva casa: se crea, queda elegida y se vuelve", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "POST /hogares": () => respuestaJson({ ...HOGAR, id: "h9", nombre: "Finca" }, 201) });
    await renderizar(<NuevaCasa />);
    await fireEvent.changeText(screen.getByLabelText("Nombre del hogar"), "Finca");
    await fireEvent.press(screen.getByRole("button", { name: "2" }));
    await fireEvent.press(screen.getByRole("button", { name: "Agregar casa" }));
    await waitFor(() => expect(useCasaSeleccionada.getState().id).toBe("h9"));
    expect(enviado("POST /hogares")).toMatchObject({ nombre: "Finca", estrato: 2 });
    expect(router.back).toHaveBeenCalled();
  });

  it("Selector de casa: lista las casas, cambia y ofrece agregar otra", async () => {
    await iniciarSesionDePrueba();
    const otra = { ...HOGAR, id: "h2", nombre: "Casa de los papás" };
    simular({ ...base, "GET /hogares": [HOGAR, otra] });
    await renderizar(<SelectorCasa />);
    await fireEvent.press(await screen.findByRole("button", { name: /Casa: Casa demo/ }));
    await fireEvent.press(await screen.findByRole("button", { name: /Casa de los papás/ }));
    await waitFor(() => expect(useCasaSeleccionada.getState().id).toBe("h2"));
    expect(await screen.findByRole("button", { name: /Casa: Casa de los papás/ })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /Casa: Casa de los papás/ }));
    await fireEvent.press(await screen.findByRole("button", { name: "Agregar otra casa" }));
    expect(router.push).toHaveBeenCalledWith("/casa/nueva");
  });

  it("Enchufes: lista cada uno con su estado y cuántos están conectados", async () => {
    await iniciarSesionDePrueba();
    simular({
      ...base,
      "GET /hogares/h1/dispositivos": [{ ...ENCHUFE, agente_id: "a1" }, { ...ENCHUFE, id: "d2", nombre: "Pasillo", agente_id: null }],
      "GET /hogares/h1/agentes": [AGENTE],
      "GET /hogares/h1/resumen": { ...RESUMEN, dispositivos: [...RESUMEN.dispositivos, { ...RESUMEN.dispositivos[0], id: "d2", en_linea: false, ultima_lectura: new Date(Date.now() - 2 * 3600_000).toISOString() }] },
    });
    await renderizar(<Enchufes />);
    expect(await screen.findByText("1 de 2 enviando datos ahora")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nevera · Conectado · Lo lee Sala" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pasillo · Sin señal desde hace 2 h · Sin agente asignado" })).toBeTruthy();
    expect(screen.getByText("Lo lee: Sala")).toBeTruthy();
    expect(screen.getByText("Sin agente asignado: no llegarán datos")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /^Nevera · / }));
    await fireEvent.press(screen.getByRole("button", { name: "Conectar un enchufe" }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["/enchufe/d1", "/enchufe/nuevo"]);
  });

  it("Enchufes: sin enchufes lo explica", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/dispositivos": [] });
    await renderizar(<Enchufes />);
    expect(await screen.findByText("Aún no tienes enchufes")).toBeTruthy();
  });

  it("Inicio: el prepago aparece si el medidor es prepago y muestra el saldo y hasta cuándo alcanza", async () => {
    await iniciarSesionDePrueba();
    const se_acaba_el = new Date(Date.now() + 8 * 86_400_000).toISOString();
    simular({
      ...base,
      "GET /hogares": [{ ...HOGAR, tipo_medidor: "prepago" }],
      "GET /hogares/h1/prepago": { ...PREPAGO, estado: "ok", saldo_cop: 28500, promedio_diario_cop: 3500, dias_restantes: 8, se_acaba_el, nivel: "verde" },
    });
    await renderizar(<Inicio />);
    expect(await screen.findByText("$28.500")).toBeTruthy();
    expect(screen.getByText(/le alcanza hasta el .* Son unos 8 días\./)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Actualizar saldo" }));
    expect(router.push).toHaveBeenCalledWith("/prepago");
  });

  it("Inicio: con medidor pospago no muestra el prepago", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares": [{ ...HOGAR, tipo_medidor: "pospago" }] });
    await renderizar(<Inicio />);
    await screen.findByText("Tus aparatos");
    expect(screen.queryByText(/Medidor prepago/)).toBeNull();
  });

  it("Inicio: el prepago a punto de acabarse se ve en rojo y lo dice", async () => {
    await iniciarSesionDePrueba();
    simular({
      ...base,
      "GET /hogares": [{ ...HOGAR, tipo_medidor: "prepago" }],
      "GET /hogares/h1/prepago": { ...PREPAGO, estado: "ok", saldo_cop: 5000, promedio_diario_cop: 3333, dias_restantes: 1.5, se_acaba_el: new Date(Date.now() + 36 * 3600_000).toISOString(), nivel: "rojo" },
    });
    await renderizar(<Inicio />);
    expect(await screen.findByText("Medidor prepago · se acaba pronto")).toBeTruthy();
  });

  it("Rutinas: lista las rutinas con su horario, días y ahorro estimado", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/rutinas": [RUTINA] });
    await renderizar(<Rutinas />);
    expect(await screen.findByText("Apaga a las 22:00 · prende a las 06:00")).toBeTruthy();
    expect(screen.getByText("Lun a Vie")).toBeTruthy();
    expect(screen.getByText("Ahorra unos $14.119 al mes")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /^Nevera\. Apaga a las 22:00/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Nueva rutina" }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["/rutina/r1", "/rutina/nueva"]);
  });

  it("Agentes: explica qué hace y avisa que sin agente no llegan datos", async () => {
    await iniciarSesionDePrueba();
    simular(base);
    await renderizar(<Agentes />);
    expect(await screen.findByText("¿Qué hace un agente?")).toBeTruthy();
    expect(await screen.findByText(/Sin agente vinculado/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Agregar agente" }));
    expect(router.push).toHaveBeenCalledWith("/agente/nuevo");
  });

  it("Agentes: uno que nunca se ha conectado y no lee ningún enchufe", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [{ ...AGENTE, conectado: false, ultima_conexion: null }] });
    await renderizar(<Agentes />);
    expect(await screen.findByText("Sala")).toBeTruthy();
    expect(screen.getByText("Nunca se ha conectado")).toBeTruthy();
    expect(screen.getByText("No lee ningún enchufe. Asígnalo desde Enchufes.")).toBeTruthy();
  });

  it("Agentes: uno conectado muestra qué enchufes lee", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [{ ...AGENTE, enchufes: [{ id: "d1", nombre: "Nevera" }, { id: "d2", nombre: "Televisor" }] }] });
    await renderizar(<Agentes />);
    expect(await screen.findByText("Conectado")).toBeTruthy();
    expect(screen.getByText("Lee: Nevera, Televisor")).toBeTruthy();
  });

  it("Agentes: sin conexión dice desde cuándo", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [{ ...AGENTE, conectado: false, ultima_conexion: new Date(Date.now() - 2 * 3600_000).toISOString() }] });
    await renderizar(<Agentes />);
    expect(await screen.findByText("Sin conexión · última vez hace 2 h")).toBeTruthy();
  });

  it("Agentes: se le cambia el nombre", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [AGENTE], "PATCH /hogares/h1/agentes/a1": () => respuestaJson({ ...AGENTE, nombre: "Patio" }) });
    await renderizar(<Agentes />);
    await fireEvent.press(await screen.findByRole("button", { name: "Cambiar nombre" }));
    await fireEvent.changeText(screen.getByLabelText("Nombre del agente"), "  Patio ");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar nombre" }));
    await waitFor(() => expect(enviado("PATCH /hogares/h1/agentes/a1")).toEqual({ nombre: "Patio" }));
  });

  it("Agentes: eliminar pide confirmación y avisa que sus enchufes quedan sin agente", async () => {
    await iniciarSesionDePrueba();
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({ ...base, "GET /hogares/h1/agentes": [{ ...AGENTE, enchufes: [{ id: "d1", nombre: "Nevera" }] }], "DELETE /hogares/h1/agentes/a1": () => ({ ok: true, status: 204, json: async () => undefined }) as Response });
    await renderizar(<Agentes />);
    await fireEvent.press(await screen.findByRole("button", { name: "Eliminar" }));
    const [titulo, mensaje, botones] = alerta.mock.calls[0];
    expect(titulo).toBe('¿Eliminar "Sala"?');
    expect(mensaje).toMatch(/enchufe quedará sin agente/);
    expect(fetchMock.mock.calls.some(([u, i]) => i?.method === "DELETE")).toBe(false); // todavía no
    await botones!.find((b) => b.text === "Eliminar")!.onPress!();
    await waitFor(() => expect(fetchMock.mock.calls.some(([u, i]) => i?.method === "DELETE" && String(u).endsWith("/agentes/a1"))).toBe(true));
    alerta.mockRestore();
  });

  it("Facturas: lleva a anotar las facturas y la lectura del medidor", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/historial-consumo": { meses: [], meses_usados: 0, promedio_kwh: null, promedio_cop: null } });
    await renderizar(<Facturas />);
    await fireEvent.press(await screen.findByRole("button", { name: "Anotar mis facturas" }));
    await fireEvent.press(screen.getByRole("button", { name: "Anotar lectura del medidor" }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["/historial", "/medidor"]);
  });

  it("Ajustes: muestra la cuenta, lleva a las casas y a las instrucciones", async () => {
    await iniciarSesionDePrueba();
    simular(base);
    await renderizar(<Ajustes />);
    expect(await screen.findByText(/ana@example.com/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ver y cambiar de casa" }));
    await fireEvent.press(screen.getByRole("button", { name: "Instrucciones" }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["/casas", "/instrucciones"]);
  });

  it("Explorar: cada categoría lleva a su sección", async () => {
    await renderizar(<Explorar />);
    const destinos: [string, string][] = [
      ["Enchufes", "/enchufes"], ["Agentes", "/agentes"], ["Rutinas", "/rutinas"], ["Facturas y medidor", "/facturas"], ["Saldo prepago", "/prepago"],
      ["Consejos", "/consejos"], ["¿Cambiar un aparato?", "/simulador"], ["Mis casas", "/casas"], ["Instrucciones", "/instrucciones"],
    ];
    for (const [nombre] of destinos) await fireEvent.press(screen.getByRole("button", { name: nombre }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(destinos.map(([, ruta]) => ruta));
  });
});

describe("Ayuda", () => {
  beforeEach(async () => {
    useAyudaVista.setState({ cargada: true, vistas: [] });
  });

  it("la sugerencia sale la primera vez y no vuelve después de descartarla", async () => {
    await renderizar(<SugerenciaAyuda tema="agentes" />);
    expect(screen.getByText("¿Primera vez en Agentes?")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));
    expect(screen.queryByText("¿Primera vez en Agentes?")).toBeNull();
    expect(useAyudaVista.getState().vistas).toEqual(["agentes"]);
  });

  it("«Ver cómo funciona» abre la explicación y tampoco vuelve a molestar", async () => {
    await renderizar(<SugerenciaAyuda tema="rutinas" />);
    await fireEvent.press(screen.getByRole("button", { name: "Ver cómo funciona" }));
    expect(router.push).toHaveBeenCalledWith("/ayuda/rutinas");
    expect(screen.queryByText("¿Primera vez en Rutinas?")).toBeNull();
  });

  it("no sale hasta saber qué ya se vio (así no parpadea)", async () => {
    useAyudaVista.setState({ cargada: false, vistas: [] });
    await renderizar(<SugerenciaAyuda tema="enchufes" />);
    expect(screen.queryByText(/Primera vez/)).toBeNull();
  });

  it("el botón «?» abre la ayuda de su sección", async () => {
    await renderizar(<BotonAyuda tema="prepago" />);
    await fireEvent.press(screen.getByRole("button", { name: "Ayuda de esta sección" }));
    expect(router.push).toHaveBeenCalledWith("/ayuda/prepago");
  });

  it("la pantalla de ayuda explica qué es, para qué sirve y cómo se usa", async () => {
    (globalThis as { __parametros?: object }).__parametros = { tema: "agentes" };
    await renderizar(<PantallaAyuda />);
    expect(screen.getByText("Qué es")).toBeTruthy();
    expect(screen.getByText("Para qué sirve")).toBeTruthy();
    expect(screen.getByText("Cómo se usa")).toBeTruthy();
    expect(screen.getByText("Ojo")).toBeTruthy();
  });

  it("un tema que no existe no rompe", async () => {
    (globalThis as { __parametros?: object }).__parametros = { tema: "inventado" };
    await renderizar(<PantallaAyuda />);
    expect(screen.getByText("No encontramos esa ayuda.")).toBeTruthy();
  });

  it("Instrucciones lista todos los temas", async () => {
    await renderizar(<Instrucciones />);
    for (const id of ORDEN_TEMAS) await fireEvent.press(screen.getByRole("button", { name: new RegExp(TEMAS[id].titulo.replace(/[?¿]/g, "\\$&")) }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(ORDEN_TEMAS.map((id) => `/ayuda/${id}`));
  });

  it("desde Ajustes se pueden volver a mostrar las sugerencias", async () => {
    useAyudaVista.setState({ cargada: true, vistas: ["agentes", "enchufes"] });
    await reiniciarAyuda();
    expect(useAyudaVista.getState().vistas).toEqual([]);
  });
});

describe("Tus datos: política y eliminar la cuenta", () => {
  const sinContenido = () => ({ ok: true, status: 204, json: async () => undefined }) as Response;
  const cuerpoDe = (metodo: string, ruta: string) => {
    const c = fetchMock.mock.calls.find(([u, i]) => i?.method === metodo && String(u) === `https://api.test${ruta}`);
    return c ? JSON.parse(c[1].body ?? "null") : undefined;
  };

  it("la política se puede leer antes de crear la cuenta y cubre lo que exige la ley", async () => {
    await renderizar(<Politica />);
    for (const titulo of ["Quién es el responsable", "Qué datos tratamos", "Para qué los usamos", "Con quién se comparten y dónde se guardan", "Cuánto tiempo los guardamos", "Tus derechos", "Seguridad", "Consultas, reclamos y quejas"]) {
      expect(screen.getByText(titulo)).toBeTruthy();
    }
    expect(screen.getByText(/Superintendencia de Industria y Comercio/)).toBeTruthy();
    expect(screen.getByText(/Ajustes › Eliminar mi cuenta/)).toBeTruthy();
  });

  it("la política da el correo de contacto del equipo para consultas y reclamos", () => {
    expect(CONTACTO.correo).toBe("juanechavarria194@gmail.com");
    const textos = POLITICA.flatMap((s) => s.parrafos ?? []);
    expect(textos.some((p) => p.includes("escribe a juanechavarria194@gmail.com") && /10 días hábiles/.test(p))).toBe(true);
    expect(textos.some((p) => /se publicará aquí/.test(p))).toBe(false);
  });

  it("el registro y el consentimiento enlazan a la política", async () => {
    await renderizar(<Registro />);
    await fireEvent.press(screen.getByRole("button", { name: "Leer la política de tratamiento de datos" }));
    expect(router.push).toHaveBeenCalledWith("/politica");
    (router.push as jest.Mock).mockClear();
    await iniciarSesionDePrueba();
    simular({ "GET /auth/yo": { ...PERFIL, tiene_consentimiento: false } });
    await renderizar(<Consentimiento />);
    await fireEvent.press(await screen.findByRole("button", { name: "Leer la política de tratamiento de datos" }));
    expect(router.push).toHaveBeenCalledWith("/politica");
  });

  it("eliminar la cuenta con contraseña: la pide, confirma y cierra la sesión", async () => {
    await iniciarSesionDePrueba();
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({ "GET /auth/yo": PERFIL, "DELETE /auth/yo": sinContenido });
    await renderizar(<EliminarCuenta />);
    const boton = async () => await screen.findByRole("button", { name: "Eliminar mi cuenta y mis datos" });
    expect((await boton()).props.accessibilityState.disabled).toBe(true); // mientras carga el perfil no se puede
    const campo = await screen.findByLabelText("Escribe tu contraseña para confirmar");
    expect((await boton()).props.accessibilityState.disabled).toBe(true); // sin contraseña tampoco
    await fireEvent.changeText(campo, "clave-segura-1");
    await fireEvent.press(await boton());
    expect(alerta).toHaveBeenCalled();
    expect(cuerpoDe("DELETE", "/auth/yo")).toBeUndefined(); // todavía no
    await alerta.mock.calls[0][2]!.find((b) => b.text === "Eliminar")!.onPress!();
    await waitFor(() => expect(cuerpoDe("DELETE", "/auth/yo")).toEqual({ contrasena: "clave-segura-1" }));
    await waitFor(() => expect(useSesion.getState().refreshToken).toBeNull());
    alerta.mockRestore();
  });

  it("con la contraseña equivocada lo dice y no cierra la sesión", async () => {
    await iniciarSesionDePrueba();
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({ "GET /auth/yo": PERFIL, "DELETE /auth/yo": () => respuestaJson({ detail: "La contraseña no es correcta" }, 403) });
    await renderizar(<EliminarCuenta />);
    await fireEvent.changeText(await screen.findByLabelText("Escribe tu contraseña para confirmar"), "mala");
    await fireEvent.press(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" }));
    await alerta.mock.calls[0][2]!.find((b) => b.text === "Eliminar")!.onPress!();
    expect(await screen.findByText("La contraseña no es correcta")).toBeTruthy();
    expect(useSesion.getState().refreshToken).not.toBeNull();
    alerta.mockRestore();
  });

  it("una cuenta de Google (sin contraseña) no la pide", async () => {
    await iniciarSesionDePrueba();
    simular({ "GET /auth/yo": { ...PERFIL, tiene_contrasena: false, tiene_google: true } });
    await renderizar(<EliminarCuenta />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Eliminar mi cuenta y mis datos" }).props.accessibilityState.disabled).toBe(false)); // cuando llega el perfil
    expect(screen.queryByLabelText("Escribe tu contraseña para confirmar")).toBeNull();
  });

  it("Ajustes enlaza a la política y a eliminar la cuenta", async () => {
    await iniciarSesionDePrueba();
    simular({ "GET /auth/yo": PERFIL, "GET /hogares": [HOGAR] });
    await renderizar(<Ajustes />);
    await fireEvent.press(await screen.findByRole("button", { name: "Política de tratamiento de datos" }));
    await fireEvent.press(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    expect((router.push as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["/politica", "/eliminar-cuenta"]);
  });
});

describe("Eliminar casa y corregir lecturas del medidor", () => {
  const OTRA = { ...HOGAR, id: "h2", nombre: "Casa de los papás" };
  const sinContenido = () => ({ ok: true, status: 204, json: async () => undefined }) as Response;
  const borrados = () => fetchMock.mock.calls.filter(([, i]) => i?.method === "DELETE").map(([u]) => String(u).replace("https://api.test", ""));

  it("eliminar una casa pide confirmación, la nombra y avisa qué se pierde", async () => {
    await iniciarSesionDePrueba();
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({ "GET /hogares": [HOGAR, OTRA], "GET /hogares/h1/tarifa": TARIFA, "DELETE /hogares/h1": sinContenido });
    await renderizar(<Casas />);
    await fireEvent.press(await screen.findByRole("button", { name: "Eliminar esta casa" }));
    const [titulo, mensaje, botones] = alerta.mock.calls[0];
    expect(titulo).toBe('¿Eliminar "Casa demo"?');
    expect(mensaje).toMatch(/enchufes, historial de consumo, agentes, avisos, facturas y rutinas/);
    expect(mensaje).not.toMatch(/única casa/); // hay otra casa
    expect(borrados()).toEqual([]); // todavía no
    await botones!.find((b) => b.text === "Eliminar")!.onPress!();
    await waitFor(() => expect(borrados()).toEqual(["/hogares/h1"]));
    alerta.mockRestore();
  });

  it("si es la única casa lo dice", async () => {
    await iniciarSesionDePrueba();
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({ "GET /hogares": [HOGAR], "GET /hogares/h1/tarifa": TARIFA });
    await renderizar(<Casas />);
    await fireEvent.press(await screen.findByRole("button", { name: "Eliminar esta casa" }));
    expect(alerta.mock.calls[0][1]).toMatch(/única casa/);
    alerta.mockRestore();
  });

  it("cancelar no borra nada", async () => {
    await iniciarSesionDePrueba();
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({ "GET /hogares": [HOGAR], "GET /hogares/h1/tarifa": TARIFA });
    await renderizar(<Casas />);
    await fireEvent.press(await screen.findByRole("button", { name: "Eliminar esta casa" }));
    const cancelar = alerta.mock.calls[0][2]!.find((b) => b.text === "Cancelar")!;
    expect(cancelar.onPress).toBeUndefined();
    expect(borrados()).toEqual([]);
    alerta.mockRestore();
  });

  it("después de eliminar la casa elegida se pasa a la que queda", async () => {
    await iniciarSesionDePrueba();
    await elegirCasa("h1");
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    let quedan = [HOGAR, OTRA];
    fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const clave = `${init.method ?? "GET"} ${String(url).replace("https://api.test", "")}`;
      if (clave === "GET /hogares") return respuestaJson(quedan);
      if (clave === "DELETE /hogares/h1") {
        quedan = [OTRA];
        return sinContenido();
      }
      if (clave.startsWith("GET /hogares/h")) return respuestaJson(TARIFA);
      return respuestaJson({ detail: `sin simular ${clave}` }, 404);
    });
    await renderizar(<Casas />);
    await fireEvent.press(await screen.findByRole("button", { name: "Eliminar esta casa" }));
    await alerta.mock.calls[0][2]!.find((b) => b.text === "Eliminar")!.onPress!();
    expect(await screen.findByText("Datos de Casa de los papás")).toBeTruthy();
    expect(useCasaSeleccionada.getState().id).toBeNull();
    alerta.mockRestore();
  });

  it("medidor: cada anotación se puede borrar (con confirmación) para corregir un error", async () => {
    await iniciarSesionDePrueba();
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    simular({
      "GET /hogares": [HOGAR],
      "GET /hogares/h1/lecturas-medidor": [{ id: "l1", lectura_kwh: 4523800, fecha: "2026-10-10" }, { id: "l0", lectura_kwh: 45000, fecha: "2026-10-01" }],
      "DELETE /hogares/h1/lecturas-medidor/l1": sinContenido,
    });
    await renderizar(<Medidor />);
    await fireEvent.press(await screen.findByRole("button", { name: /Borrar la lectura .* del 2026-10-10/ }));
    expect(alerta.mock.calls[0][0]).toMatch(/¿Borrar la lectura .*4.*523.*800\?/);
    expect(borrados()).toEqual([]);
    await alerta.mock.calls[0][2]!.find((b) => b.text === "Borrar")!.onPress!();
    await waitFor(() => expect(borrados()).toEqual(["/hogares/h1/lecturas-medidor/l1"]));
    alerta.mockRestore();
  });
});

describe("Enchufes", () => {
  const base = { "GET /hogares": [HOGAR], "GET /hogares/h1/dispositivos": [ENCHUFE] };

  it("con varios agentes se elige cuál lee el enchufe nuevo", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [AGENTE, { ...AGENTE, id: "a2", nombre: "Patio" }], "POST /hogares/h1/dispositivos": () => respuestaJson(ENCHUFE, 201) });
    await renderizar(<NuevoEnchufe />);
    await fireEvent.press(await screen.findByRole("button", { name: "Patio" }));
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lámpara");
    await fireEvent.changeText(screen.getByLabelText("ID del dispositivo en Tuya"), "abc");
    await fireEvent.press(screen.getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(enviado("POST /hogares/h1/dispositivos")).toMatchObject({ nombre: "Lámpara", agente_id: "a2" }));
  });

  it("con un solo agente se propone ese", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [AGENTE], "POST /hogares/h1/dispositivos": () => respuestaJson(ENCHUFE, 201) });
    await renderizar(<NuevoEnchufe />);
    expect((await screen.findByRole("button", { name: "Sala" })).props.accessibilityState.selected).toBe(true);
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Lámpara");
    await fireEvent.changeText(screen.getByLabelText("ID del dispositivo en Tuya"), "abc");
    await fireEvent.press(screen.getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(enviado("POST /hogares/h1/dispositivos")).toMatchObject({ agente_id: "a1" }));
  });

  it("sin agentes en la casa no aparece el selector", async () => {
    await iniciarSesionDePrueba();
    simular({ ...base, "GET /hogares/h1/agentes": [] });
    await renderizar(<NuevoEnchufe />);
    await screen.findByLabelText("Nombre");
    expect(screen.queryByText("¿Qué agente lo lee?")).toBeNull();
  });

  it("al editar se cambia el agente y se puede quitar", async () => {
    await iniciarSesionDePrueba();
    (globalThis as { __parametros?: object }).__parametros = { id: "d1" };
    simular({
      ...base,
      "GET /hogares/h1/dispositivos": [{ ...ENCHUFE, agente_id: "a1" }],
      "GET /hogares/h1/agentes": [AGENTE, { ...AGENTE, id: "a2", nombre: "Patio" }],
      "PATCH /hogares/h1/dispositivos/d1": () => respuestaJson(ENCHUFE),
    });
    await renderizar(<EditarEnchufe />);
    expect((await screen.findByRole("button", { name: "Sala" })).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Patio" }));
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(enviado("PATCH /hogares/h1/dispositivos/d1")).toMatchObject({ agente_id: "a2" }));
    await fireEvent.press(screen.getByRole("button", { name: "Ninguno" }));
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, i]) => i?.method === "PATCH").map(([, i]) => JSON.parse(i.body).agente_id)).toEqual(["a2", null]));
  });

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
      expect(enviado("POST /hogares/h1/dispositivos")).toEqual({ tuya_id: "abc123", nombre: "Plancha", tipo_aparato: null, alto_riesgo: true, umbral_minutos_encendido: 45, agente_id: null }),
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
    await waitFor(() => expect(enviado("PATCH /hogares/h1/dispositivos/d1")).toEqual({ nombre: "Nevera nueva", tipo_aparato: null, alto_riesgo: false, umbral_minutos_encendido: null, agente_id: null }));
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
  const CON_CODIGO = { id: "a1", nombre: "Computador de la casa", codigo: "123456", expira_en: new Date(Date.now() + 10 * 60_000).toISOString() };

  it("crea el agente y muestra su código de 6 dígitos, sin claves para copiar", async () => {
    await iniciarSesionDePrueba();
    simular({
      "GET /hogares": [HOGAR],
      "GET /hogares/h1/agentes": [{ id: "a1", nombre: "Computador de la casa", ultima_conexion: null, creado_en: "2026-10-15T00:00:00Z", vinculado: false, conectado: false, codigo_pendiente: true, enchufes: [] }],
      "POST /hogares/h1/agentes/con-codigo": () => respuestaJson(CON_CODIGO, 201),
    });
    await renderizar(<VincularAgente />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ver el código" }));
    expect(await screen.findByText("123 456")).toBeTruthy();
    expect(screen.getByText("Vence en 10 minutos")).toBeTruthy();
    expect(enviado("POST /hogares/h1/agentes/con-codigo")).toEqual({ nombre: "Computador de la casa" });
    expect(screen.queryByText(/AGENT_TOKEN/)).toBeNull();
    expect(screen.getByText(/--vincular 123456/)).toBeTruthy(); // ayuda para el equipo mientras no haya instalador
  });

  it("avisa cuando el agente se vincula y lleva a asignar enchufes", async () => {
    await iniciarSesionDePrueba();
    const agente = { id: "a1", nombre: "Computador de la casa", ultima_conexion: null, creado_en: "2026-10-15T00:00:00Z", vinculado: false, conectado: false, codigo_pendiente: true, enchufes: [] };
    let vinculado = false;
    fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const clave = `${init.method ?? "GET"} ${String(url).replace("https://api.test", "")}`;
      if (clave === "GET /hogares") return respuestaJson([HOGAR]);
      if (clave === "POST /hogares/h1/agentes/con-codigo") return respuestaJson(CON_CODIGO, 201);
      if (clave === "GET /hogares/h1/agentes") return respuestaJson([{ ...agente, vinculado, conectado: vinculado, codigo_pendiente: !vinculado }]);
      return respuestaJson({ detail: `sin simular ${clave}` }, 404);
    });
    const cliente = clienteDePrueba();
    await renderizar(<VincularAgente />, cliente);
    await fireEvent.press(await screen.findByRole("button", { name: "Ver el código" }));
    await screen.findByText("123 456");
    expect(screen.queryByText(/está conectado/)).toBeNull();
    vinculado = true;
    await act(async () => void (await cliente.refetchQueries({ queryKey: ["agentes"] })));
    expect(await screen.findByText("¡Listo! «Computador de la casa» está conectado")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ir a mis enchufes" }));
    expect(router.replace).toHaveBeenCalledWith("/enchufes");
  });

  it("un código vencido se puede pedir de nuevo", async () => {
    await iniciarSesionDePrueba();
    let pendiente = false; // el vencido ya no cuenta como pendiente; el nuevo sí
    const agente = () => ({ id: "a1", nombre: "Computador de la casa", ultima_conexion: null, creado_en: "2026-10-15T00:00:00Z", vinculado: false, conectado: false, codigo_pendiente: pendiente, enchufes: [] });
    fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const clave = `${init.method ?? "GET"} ${String(url).replace("https://api.test", "")}`;
      if (clave === "GET /hogares") return respuestaJson([HOGAR]);
      if (clave === "GET /hogares/h1/agentes") return respuestaJson([agente()]);
      if (clave === "POST /hogares/h1/agentes/con-codigo") return respuestaJson({ ...CON_CODIGO, expira_en: new Date(Date.now() - 1000).toISOString() }, 201);
      if (clave === "POST /hogares/h1/agentes/a1/codigo") {
        pendiente = true;
        return respuestaJson({ ...CON_CODIGO, codigo: "654321", expira_en: new Date(Date.now() + 10 * 60_000).toISOString() });
      }
      return respuestaJson({ detail: `sin simular ${clave}` }, 404);
    });
    await renderizar(<VincularAgente />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ver el código" }));
    expect(await screen.findByText("Venció")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Pedir un código nuevo" }));
    expect(await screen.findByText("654 321")).toBeTruthy();
  });

  it("para usarlo en otro computador genera un código nuevo del mismo agente", async () => {
    await iniciarSesionDePrueba();
    (globalThis as { __parametros?: object }).__parametros = { agente: "a1" };
    const existente = { id: "a1", nombre: "Sala", ultima_conexion: null, creado_en: "2026-10-15T00:00:00Z", vinculado: true, conectado: true, enchufes: [] };
    let pendiente = false;
    fetchMock.mockImplementation(async (url: string, init: RequestInit = {}) => {
      const clave = `${init.method ?? "GET"} ${String(url).replace("https://api.test", "")}`;
      if (clave === "GET /hogares") return respuestaJson([HOGAR]);
      if (clave === "GET /hogares/h1/agentes") return respuestaJson([{ ...existente, codigo_pendiente: pendiente }]);
      if (clave === "POST /hogares/h1/agentes/a1/codigo") {
        pendiente = true;
        return respuestaJson({ ...CON_CODIGO, nombre: "Sala" });
      }
      return respuestaJson({ detail: `sin simular ${clave}` }, 404);
    });
    await renderizar(<VincularAgente />);
    expect(await screen.findByText(/dejará de funcionar/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ver el código" }));
    expect(await screen.findByText("123 456")).toBeTruthy();
    expect(screen.queryByText(/está conectado/)).toBeNull(); // el agente viejo sigue «conectado» y eso no es haber usado el código nuevo
  });
});

it("haceCuanto", () => {
  const ahora = Date.parse("2026-10-12T12:00:00Z");
  expect(haceCuanto("2026-10-12T11:59:40Z", ahora)).toBe("hace instantes");
  expect(haceCuanto("2026-10-12T11:50:00Z", ahora)).toBe("hace 10 min");
  expect(haceCuanto("2026-10-12T07:00:00Z", ahora)).toBe("hace 5 h");
  expect(haceCuanto("2026-10-08T12:00:00Z", ahora)).toBe("hace 4 días");
});
