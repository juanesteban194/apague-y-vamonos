/** El navegador abre la PRIMERA pantalla disponible de la lista. Las pantallas que se ven con y sin sesión (la política de datos)
 *  deben ir al final: si van primero, al cerrar sesión la persona queda en una pantalla sin salida y no puede entrar ni crear la cuenta. */
import { readFileSync } from "fs";
import { join } from "path";

const layout = readFileSync(join(__dirname, "..", "app", "_layout.tsx"), "utf8");

it("las pantallas sin guardia van después de las que dependen de la sesión", () => {
  const primeraProtegida = layout.indexOf("<Stack.Protected");
  const ultimaProtegida = layout.lastIndexOf("</Stack.Protected>");
  const politica = layout.indexOf('<Stack.Screen name="politica"');
  expect(primeraProtegida).toBeGreaterThan(-1);
  expect(politica).toBeGreaterThan(ultimaProtegida);
});

it("sin sesión la primera pantalla disponible es el login", () => {
  const sinSesion = layout.slice(layout.indexOf('guard={paso === "sesion"}'));
  expect(sinSesion.indexOf('name="(auth)/login"')).toBeLessThan(sinSesion.indexOf('name="(auth)/registro"'));
  // y antes de la primera pantalla de login no hay ninguna pantalla sin guardia
  const antes = layout.slice(layout.indexOf("<Stack screenOptions"), layout.indexOf('guard={paso === "sesion"}'));
  expect(antes).not.toMatch(/<Stack\.Screen/);
});

it("la política tiene cabecera con botón de volver (se abre desde el registro y desde Ajustes)", () => {
  expect(layout).toMatch(/name="politica" options=\{\{ \.\.\.opcionesCabecera/);
});
