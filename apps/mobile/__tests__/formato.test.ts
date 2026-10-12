import { etiquetaPunto, mesDeTarifa } from "@/lib/fechas";
import { formatoCOP, formatoPotencia, formatoTarifa } from "@/lib/formato";
import { TEXTO_MIN, tipografia } from "@/theme";

describe("formatoCOP", () => {
  it.each([
    [8.1463, "$8,15"],
    [0.64, "$0,64"],
    [100, "$100"],
    [1234567, "$1.234.567"],
    [814.63, "$815"],
    [0, "$0,00"],
    [-5, "-$5,00"],
  ])("%p → %p", (valor, esperado) => expect(formatoCOP(valor)).toBe(esperado));

  it("sin dato muestra una raya, no $0", () => {
    expect(formatoCOP(null)).toBe("—");
    expect(formatoCOP(undefined)).toBe("—");
  });
});

it("potencia y tarifa", () => {
  expect(formatoPotencia(26.5)).toBe("27 W");
  expect(formatoPotencia(4.25)).toBe("4,3 W");
  expect(formatoTarifa(814.63)).toBe("$814,63 por kWh");
});

describe("fechas del backend (offset de Bogotá, sin depender de la zona del teléfono)", () => {
  it("etiquetas por periodo", () => {
    expect(etiquetaPunto("2026-10-12T14:00:00-05:00", "dia")).toBe("14");
    expect(etiquetaPunto("2026-10-12T00:00:00-05:00", "dia")).toBe("0");
    expect(etiquetaPunto("2026-10-12T00:00:00-05:00", "semana")).toBe("lun"); // 12-oct-2026 es lunes
    expect(etiquetaPunto("2026-10-18T00:00:00-05:00", "semana")).toBe("dom");
    expect(etiquetaPunto("2026-10-03T00:00:00-05:00", "mes")).toBe("3");
  });
  it("mes de la tarifa", () => expect(mesDeTarifa("2026-09-01")).toBe("septiembre de 2026"));
});

it("toda la tipografía respeta el mínimo de 15 px", () => {
  for (const estilo of Object.values(tipografia)) expect(estilo.fontSize).toBeGreaterThanOrEqual(TEXTO_MIN);
});
