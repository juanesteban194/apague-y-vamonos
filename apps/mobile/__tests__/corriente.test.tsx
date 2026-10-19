/** Tarjeta «Corriente habitual» del enchufe y el formato de amperios. */
import { screen } from "@testing-library/react-native";

import { TarjetaCorriente } from "@/components/TarjetaCorriente";
import { formatoAmperios } from "@/lib/formato";

import { renderizar, respuestaJson } from "./auxiliares";

const fetchMock = jest.fn();
const responder = (cuerpo: unknown) => fetchMock.mockImplementation(async () => respuestaJson(cuerpo));

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("Corriente habitual", () => {
  it("formato de amperios con coma decimal", () => {
    expect(formatoAmperios(820)).toBe("0,82 A");
    expect(formatoAmperios(2040)).toBe("2,0 A");
  });

  it("muestra lo normal, lo de ahora y su estado", async () => {
    responder({ estado: "normal", normal_ma: 800, bajo_ma: 780, alto_ma: 820, ahora_ma: 810, dias: 3 });
    await renderizar(<TarjetaCorriente hogarId="h1" dispositivoId="d1" />);
    expect(await screen.findByLabelText("Lo normal: 0,80 A (de 0,78 A a 0,82 A)")).toBeTruthy();
    expect(screen.getByLabelText("Ahora: 0,81 A")).toBeTruthy();
    expect(screen.getByText("Normal")).toBeTruthy();
    expect(screen.getByText(/puede que haya otro dispositivo conectado/)).toBeTruthy();
  });

  it("cuando se sale de lo normal lo dice con una pastilla", async () => {
    responder({ estado: "alta", normal_ma: 800, bajo_ma: 780, alto_ma: 820, ahora_ma: 2000, dias: 3 });
    await renderizar(<TarjetaCorriente hogarId="h1" dispositivoId="d1" />);
    expect(await screen.findByText("Más de lo normal")).toBeTruthy();
    expect(screen.getByLabelText("Ahora: 2,0 A")).toBeTruthy();
  });

  it("mientras aprende no muestra cifras", async () => {
    responder({ estado: "aprendiendo", normal_ma: null, bajo_ma: null, alto_ma: null, ahora_ma: null, dias: 0 });
    await renderizar(<TarjetaCorriente hogarId="h1" dispositivoId="d1" />);
    expect(await screen.findByText("Aprendiendo")).toBeTruthy();
    expect(screen.queryByLabelText(/Lo normal/)).toBeNull();
    expect(screen.getByText(/Con 2 días de uso te avisamos/)).toBeTruthy();
  });
});
