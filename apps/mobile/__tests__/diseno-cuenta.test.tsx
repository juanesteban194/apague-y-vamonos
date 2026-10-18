/** Rediseño de la entrada y la cuenta: lo que se agregó (ver la contraseña, enlaces accesibles, requisito en vivo, consentimiento legible). */
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { cerrarSesion } from "@/api/sesion";
import { TEXTO_CONSENTIMIENTO } from "@/lib/textos";
import Login from "../app/(auth)/login";
import Recuperar from "../app/(auth)/recuperar";
import Registro from "../app/(auth)/registro";
import Consentimiento from "../app/(onboarding)/consentimiento";
import EliminarCuenta from "../app/eliminar-cuenta";

import { iniciarSesionDePrueba, renderizar, respuestaJson } from "./auxiliares";

const PERFIL = { id: "u1", email: "ana@example.com", nombre: "Ana Pérez", tiene_consentimiento: false, tiene_contrasena: true, tiene_google: false, email_verificado: false };
const fetchMock = jest.fn();

beforeEach(async () => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => (String(url).endsWith("/auth/yo") ? respuestaJson(PERFIL) : respuestaJson({ detail: "sin simular" }, 404)));
  global.fetch = fetchMock as unknown as typeof fetch;
  await cerrarSesion();
});

it("entrar: la contraseña se puede ver y volver a ocultar", async () => {
  await renderizar(<Login />);
  const campo = () => screen.getByLabelText("Contraseña");
  expect(campo().props.secureTextEntry).toBe(true);
  await fireEvent.press(screen.getByRole("button", { name: "Mostrar contraseña" }));
  expect(campo().props.secureTextEntry).toBe(false);
  await fireEvent.press(screen.getByRole("button", { name: "Ocultar contraseña" }));
  expect(campo().props.secureTextEntry).toBe(true);
});

it("entrar: los enlaces se anuncian como enlaces y miden al menos 44 px", async () => {
  await renderizar(<Login />);
  for (const [nombre] of [["¿Olvidaste tu contraseña?"], ["¿No tienes cuenta? Crear cuenta"]]) {
    const enlace = screen.getByRole("link", { name: nombre });
    expect(StyleSheet.flatten(enlace.props.style).minHeight).toBeGreaterThanOrEqual(44);
  }
  expect(screen.getByText("Crear cuenta")).toBeTruthy();
});

it("crear cuenta: el requisito de la contraseña se marca al cumplirse y no hay texto suelto con los campos vacíos", async () => {
  await renderizar(<Registro />);
  expect(screen.getByLabelText("Mínimo 8 caracteres")).toBeTruthy();
  expect(screen.queryByText("Escribe tu nombre.")).toBeNull(); // la pista sale solo cuando empiezas a llenar
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), "clave-segura-1");
  expect(screen.getByLabelText("Mínimo 8 caracteres. Listo")).toBeTruthy();
});

it("consentimiento: resume lo esencial y muestra el texto exacto que se autoriza", async () => {
  await iniciarSesionDePrueba();
  await renderizar(<Consentimiento />);
  expect(await screen.findByText("Hola, Ana")).toBeTruthy();
  expect(screen.getByText("Qué usamos")).toBeTruthy();
  expect(screen.getByText("Lo que nunca hacemos")).toBeTruthy();
  expect(screen.getByText(`«${TEXTO_CONSENTIMIENTO}»`)).toBeTruthy();
});

it("el consentimiento sigue autorizando lo mismo: datos, ley y finalidades", () => {
  for (const parte of ["nombre", "correo", "consumo de energía de mi casa", "Ley 1581 de 2012", "costo", "avisos", "recomendaciones de ahorro"]) expect(TEXTO_CONSENTIMIENTO).toContain(parte);
});

it("recuperar: dice en qué paso vas", async () => {
  await renderizar(<Recuperar />);
  expect(screen.getByText("Paso 1 de 2")).toBeTruthy();
});

it("eliminar la cuenta: lista lo que se borra y pide la contraseña con opción de verla", async () => {
  await iniciarSesionDePrueba();
  fetchMock.mockImplementation(async () => respuestaJson({ ...PERFIL, tiene_consentimiento: true }));
  await renderizar(<EliminarCuenta />);
  expect(await screen.findByText("ana@example.com")).toBeTruthy();
  for (const t of ["Tu cuenta", "Tus casas", "Casas compartidas", "Programas de agente"]) expect(screen.getByText(t)).toBeTruthy();
  await waitFor(() => expect(screen.getByRole("button", { name: "Mostrar contraseña" })).toBeTruthy());
});
