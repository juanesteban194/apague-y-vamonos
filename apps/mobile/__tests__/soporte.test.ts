import { enlaceCorreo, enlaceWhatsApp, numeroLegible } from "../src/features/soporte/contacto";

describe("Ayuda al cliente", () => {
  it("arma el enlace de WhatsApp con el mensaje ya escrito y sin signos en el número", () => {
    expect(enlaceWhatsApp("+57 300 123 4567")).toBe("https://wa.me/573001234567?text=Hola%2C%20necesito%20ayuda%20con%20%C2%ABApague%20y%20v%C3%A1monos%C2%BB.");
  });

  it("muestra el número como se lee en Colombia", () => {
    expect(numeroLegible("573001234567")).toBe("+57 300 123 4567");
  });

  it("el correo lleva asunto y el nombre de la casa", () => {
    const url = enlaceCorreo("equipo@ejemplo.com", "Casa Restrepo");
    expect(url.startsWith("mailto:equipo@ejemplo.com?subject=Ayuda%20con%20Apague%20y%20v%C3%A1monos&body=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Mi casa en la app: Casa Restrepo");
  });
});
