/** Tocar una barra (o recorrerlas con el lector de pantalla) muestra cuánto costó ese momento. */
import { fireEvent, render, screen } from "@testing-library/react-native";

import { BarrasConsumo } from "@/components/BarrasConsumo";
import { detallePunto } from "@/lib/fechas";

const horas = Array.from({ length: 24 }, (_, h) => ({ inicio: `2026-10-12T${String(h).padStart(2, "0")}:00:00-05:00`, kwh: 0.05, costo_cop: h < 16 ? 10 + h : 0 }));
const semana = Array.from({ length: 7 }, (_, i) => ({ inicio: `2026-10-${String(12 + i).padStart(2, "0")}T00:00:00-05:00`, kwh: 1, costo_cop: 1000 + i * 100 }));

/** Simula un toque a `x` píxeles del borde izquierdo de una gráfica de 240 px. */
async function tocarEn(x: number) {
  const capa = screen.getByTestId("barras-tactiles");
  await fireEvent(capa, "layout", { nativeEvent: { layout: { width: 240, height: 168 } } });
  await fireEvent(capa, "responderGrant", { nativeEvent: { locationX: x } });
}

describe("Barras que se pueden tocar", () => {
  it("cada momento dicho completo", () => {
    expect(detallePunto("2026-10-12T14:00:00-05:00", "dia", "")).toBe("De 14:00 a 15:00");
    expect(detallePunto("2026-10-12T23:00:00-05:00", "dia", "")).toBe("De 23:00 a 0:00");
    expect(detallePunto("2026-10-19T00:00:00-05:00", "semana", "")).toBe("Lunes 19 de octubre");
    expect(detallePunto("2026-09-01T00:00:00-05:00", "mes", "2026-10-01T00:00:00-05:00")).toBe("Septiembre");
    expect(detallePunto("2025-12-01T00:00:00-05:00", "mes", "2026-10-01T00:00:00-05:00")).toBe("Diciembre de 2025");
  });

  it("tocar una hora muestra cuánto costó esa hora", async () => {
    await render(<BarrasConsumo serie={horas} periodo="dia" />);
    expect(screen.getByText(/^Esta hora/)).toBeTruthy(); // antes de tocar: la hora más reciente
    await tocarEn(145); // 240 px / 24 barras = 10 px por barra → la barra 14
    expect(screen.getByText(/^De 14:00 a 15:00\s+\$24$/)).toBeTruthy();
    expect(screen.getByRole("adjustable").props.accessibilityValue).toEqual({ text: "De 14:00 a 15:00: $24" });
  });

  it("tocar un día de la semana muestra su fecha y lo que costó", async () => {
    await render(<BarrasConsumo serie={semana} periodo="semana" />);
    await tocarEn(5); // la primera barra: lunes 12
    expect(screen.getByText(/^Lunes 12 de octubre\s+\$1\.000$/)).toBeTruthy();
  });

  it("en «mes» la leyenda aparece al tocar un mes", async () => {
    const meses = ["2026-08", "2026-09", "2026-10"].map((m, i) => ({ inicio: `${m}-01T00:00:00-05:00`, kwh: 10, costo_cop: [27900, 25300, 21400][i] }));
    await render(<BarrasConsumo serie={meses} periodo="mes" />);
    expect(screen.queryByText(/Septiembre/)).toBeNull();
    await tocarEn(120); // 240 / 3 = 80 px por barra → septiembre
    expect(screen.getByText(/^Septiembre\s+\$25\.300$/)).toBeTruthy();
  });

  it("con lector de pantalla se recorren las barras deslizando arriba y abajo", async () => {
    await render(<BarrasConsumo serie={semana} periodo="semana" />);
    const grafica = screen.getByRole("adjustable");
    await fireEvent(grafica, "accessibilityAction", { nativeEvent: { actionName: "decrement" } }); // desde hoy (domingo 18) al sábado 17
    expect(screen.getByRole("adjustable").props.accessibilityValue).toEqual({ text: "Sábado 17 de octubre: $1.500" });
    await fireEvent(grafica, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(screen.getByRole("adjustable").props.accessibilityValue).toEqual({ text: "Domingo 18 de octubre: $1.600" });
  });

  it("sin consumo no hay nada que tocar", async () => {
    await render(<BarrasConsumo serie={semana.map((p) => ({ ...p, costo_cop: 0, kwh: 0 }))} periodo="semana" />);
    expect(screen.queryByTestId("barras-tactiles")).toBeNull();
  });
});
