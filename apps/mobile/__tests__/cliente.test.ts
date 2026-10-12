import { ErrorApi, iniciarSesion, obtenerHogares } from "@/api/cliente";
import { cerrarSesion, guardarTokens, useSesion } from "@/api/sesion";

import { iniciarSesionDePrueba, jwtFalso, respuestaJson } from "./auxiliares";

const fetchMock = jest.fn();
beforeEach(async () => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  await cerrarSesion();
});

it("login guarda los tokens", async () => {
  fetchMock.mockResolvedValueOnce(respuestaJson({ access_token: jwtFalso(), refresh_token: jwtFalso(86400), token_type: "bearer" }));
  await iniciarSesion("  ana@example.com ", "clave");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "ana@example.com", contrasena: "clave" });
  expect(useSesion.getState().refreshToken).not.toBeNull();
});

it("login con clave mala da un mensaje claro", async () => {
  fetchMock.mockResolvedValueOnce(respuestaJson({ detail: "x" }, 401));
  await expect(iniciarSesion("a@b.co", "mala")).rejects.toThrow("Correo o contraseña incorrectos");
});

it("si el token de acceso venció, lo renueva y reintenta una vez", async () => {
  await guardarTokens({ access_token: jwtFalso(-10), refresh_token: jwtFalso(86400) }); // acceso ya vencido
  const nuevo = jwtFalso();
  fetchMock
    .mockResolvedValueOnce(respuestaJson({ access_token: nuevo, refresh_token: jwtFalso(86400), token_type: "bearer" })) // /auth/renovar
    .mockResolvedValueOnce(respuestaJson([{ id: "h1" }])); // /hogares
  await expect(obtenerHogares()).resolves.toEqual([{ id: "h1" }]);
  expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/auth/renovar");
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${nuevo}`);
});

it("si la renovación es rechazada, cierra la sesión", async () => {
  await iniciarSesionDePrueba();
  fetchMock.mockResolvedValueOnce(respuestaJson({}, 401)).mockResolvedValueOnce(respuestaJson({}, 401));
  await expect(obtenerHogares()).rejects.toBeInstanceOf(ErrorApi);
  expect(useSesion.getState().refreshToken).toBeNull();
});

it("sin red lanza un error con estado 0", async () => {
  await iniciarSesionDePrueba();
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  await expect(obtenerHogares()).rejects.toMatchObject({ estado: 0, message: "No hay conexión con el servidor" });
});
