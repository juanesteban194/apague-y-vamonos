/** Vista «Mes» del dispositivo: una barra por mes (los últimos 12) y la lista de lo que costó cada mes. */
import { render, screen } from "@testing-library/react-native";

import { BarrasConsumo } from "@/components/BarrasConsumo";
import { ConsumoMeses } from "@/components/ConsumoMeses";

// Nov-2025 … oct-2026; el enchufe se conectó en julio de 2026.
const MESES = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
const COSTOS = [0, 0, 0, 0, 0, 0, 0, 0, 12400, 27900, 25300, 21400];
const serie = MESES.map((m, i) => ({ inicio: `${m}-01T00:00:00-05:00`, kwh: COSTOS[i] / 900, costo_cop: COSTOS[i] }));

describe("Consumo por meses", () => {
  it("la gráfica resalta el mes actual y lo dice por su nombre", async () => {
    await render(<BarrasConsumo serie={serie} periodo="mes" />);
    expect(screen.getByRole("image").props.accessibilityLabel).toBe(
      "Gráfica del costo por mes. Lo más alto: $27.900 en agosto. El último: $21.400 en octubre.",
    );
    expect(screen.queryByText(/^Este mes/)).toBeNull(); // sin leyenda: la pantalla ya muestra lo de este mes como cifra
    expect(screen.getByText("Oct")).toBeTruthy(); // el mes actual siempre lleva su etiqueta
  });

  it("lista cada mes desde que hay consumo, del más reciente al más viejo", async () => {
    await render(<ConsumoMeses serie={serie} />);
    const filas = ["Octubre, va hasta hoy: $21.400", "Septiembre: $25.300", "Agosto: $27.900", "Julio: $12.400"];
    for (const f of filas) expect(screen.getByLabelText(f)).toBeTruthy();
    expect(screen.queryByText("Junio")).toBeNull(); // antes de conectar el enchufe no se lista
  });

  it("los meses de otro año llevan el año", async () => {
    const conDiciembre = serie.map((p, i) => (i === 1 ? { ...p, kwh: 10, costo_cop: 9000 } : p));
    await render(<ConsumoMeses serie={conDiciembre} />);
    expect(screen.getByLabelText("Diciembre de 2025: $9.000")).toBeTruthy();
  });

  it("sin consumo no muestra la lista", async () => {
    await render(<ConsumoMeses serie={serie.map((p) => ({ ...p, kwh: 0, costo_cop: 0 }))} />);
    expect(screen.queryByText(/Va hasta hoy/)).toBeNull();
  });
});
