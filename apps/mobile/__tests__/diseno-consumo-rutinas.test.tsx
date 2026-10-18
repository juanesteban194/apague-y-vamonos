/** Rediseño de Dispositivo, dinero (facturas, medidor, prepago) y rutinas: lo que el diseño promete y un lector de pantalla necesita. */
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Rutina } from "@/api/tipos";
import { BarrasConsumo } from "@/components/BarrasConsumo";
import { ConsumoSegmentado } from "@/components/ConsumoSegmentado";
import { DineroMovimientos } from "@/components/DineroMovimientos";
import { SelectorDias } from "@/components/SelectorDias";
import { TarjetaRutina } from "@/components/TarjetaRutina";

const hora = (h: number, costo: number) => ({ inicio: `2026-10-12T${String(h).padStart(2, "0")}:00:00-05:00`, kwh: costo / 800, costo_cop: costo });

describe("Gráfica de barras propia", () => {
  it("resume para el lector de pantalla el más alto y el último, sin kWh", async () => {
    const serie = Array.from({ length: 24 }, (_, h) => hora(h, h <= 15 ? [20, 30, 58, 41][h % 4] : 0));
    await render(<BarrasConsumo serie={serie} periodo="dia" />);
    const grafica = screen.getByRole("image");
    expect(grafica.props.accessibilityLabel).toMatch(/^Gráfica del costo por hora\. Lo más alto: \$58 a las 2:00\. El último: \$41 a las 15:00\.$/);
    expect(screen.getByText(/^Esta hora\s+\$41$/)).toBeTruthy(); // leyenda de la barra resaltada
    expect(screen.getByText("$60")).toBeTruthy(); // tope redondo del eje, justo por encima de $58
    expect(screen.queryByText(/kWh/)).toBeNull();
  });

  it("sin consumo lo dice y no inventa una barra resaltada", async () => {
    await render(<BarrasConsumo serie={Array.from({ length: 7 }, (_, i) => ({ ...hora(0, 0), inicio: `2026-10-${12 + i}T00:00:00-05:00` }))} periodo="semana" />);
    expect(screen.getByRole("image").props.accessibilityLabel).toBe("Gráfica del costo por día. Aún no hay consumo en este periodo.");
    expect(screen.queryByText("Hoy")).toBeNull();
    expect(screen.getByText("Lun")).toBeTruthy(); // días con mayúscula inicial
  });
});

describe("Control segmentado", () => {
  it("cada opción es una pestaña con su estado y cambia al tocarla", async () => {
    const alCambiar = jest.fn();
    const opciones = [
      { valor: "dia", titulo: "Día" },
      { valor: "semana", titulo: "Semana" },
    ] as const;
    await render(<ConsumoSegmentado etiqueta="Periodo" opciones={opciones} valor="dia" alCambiar={alCambiar} />);
    expect(screen.getByRole("tab", { name: "Día" }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole("tab", { name: "Semana" }).props.accessibilityState.selected).toBe(false);
    await fireEvent.press(screen.getByRole("tab", { name: "Día" })); // la elegida no vuelve a pedir datos
    expect(alCambiar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("tab", { name: "Semana" }));
    expect(alCambiar).toHaveBeenCalledWith("semana");
  });
});

describe("Historial de anotaciones", () => {
  it("marca la última y agrupa cada fila para el lector de pantalla", async () => {
    await render(
      <DineroMovimientos
        filas={[
          { clave: "a", valor: "$28.500", detalle: "hace 5 h", nota: "Gastaste $3.600", destacada: true },
          { clave: "b", valor: "$32.100", detalle: "hace 29 h" },
        ]}
      />,
    );
    expect(screen.getByLabelText("$28.500. la última. hace 5 h. Gastaste $3.600")).toBeTruthy();
    expect(screen.getByText("$32.100")).toBeTruthy();
    expect(screen.getAllByText(/Última/)).toHaveLength(1);
  });
});

describe("Rutinas", () => {
  const RUTINA: Rutina = {
    id: "r1", dispositivo_id: "d1", dispositivo_nombre: "Computador", dias: [0, 1, 2, 3, 4], hora_apagado: "22:00:00", hora_encendido: "07:00:00",
    activa: true, ahorro_estimado_cop_mes: 2100, ultima_ejecucion: null,
  };

  it("la tarjeta muestra las horas en grande, el ahorro y conserva su etiqueta accesible", async () => {
    await render(<TarjetaRutina rutina={RUTINA} alPulsar={() => {}} />);
    expect(screen.getByRole("button", { name: "Computador. Apaga a las 22:00 · prende a las 07:00. Lun a Vie" })).toBeTruthy();
    expect(screen.getByText("22:00")).toBeTruthy();
    expect(screen.getByText("07:00")).toBeTruthy();
    expect(screen.getByText("Ahorra unos $2.100 al mes")).toBeTruthy();
  });

  it("una pausada lo dice y una fecha ilegible no sale como «NaN»", async () => {
    const rara = { ...RUTINA, activa: false, ultima_ejecucion: { cuando: "", accion: "apagar", resultado: "ok" } };
    await render(<TarjetaRutina rutina={rara} alPulsar={() => {}} />);
    expect(screen.getByText("Pausada")).toBeTruthy();
    expect(screen.getByText("Se apagó")).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it("el selector de días resume lo elegido", async () => {
    const alCambiar = jest.fn();
    const { rerender } = await render(<SelectorDias dias={[0, 1, 2, 3, 4]} alCambiar={alCambiar} />);
    expect(screen.getByText("Lun a Vie")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sáb" }).props.accessibilityState.selected).toBe(false);
    await fireEvent.press(screen.getByRole("button", { name: "Sáb" }));
    expect(alCambiar).toHaveBeenCalledWith([0, 1, 2, 3, 4, 5]);
    await rerender(<SelectorDias dias={[]} alCambiar={alCambiar} />);
    expect(screen.getByText("Ningún día")).toBeTruthy();
  });
});
