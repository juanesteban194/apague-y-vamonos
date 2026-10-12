import { aplicarEvento } from "@/features/consumo/tiempoReal";

import { clienteDePrueba, RESUMEN } from "./auxiliares";

const clave = ["resumen", "h1"];

it("una lectura actualiza potencia, estado y marca en línea", () => {
  const cliente = clienteDePrueba();
  cliente.setQueryData(clave, { ...RESUMEN, dispositivos: [{ ...RESUMEN.dispositivos[0], en_linea: false, potencia_w: 1 }] });
  aplicarEvento(cliente, "h1", {
    tipo: "lectura", dispositivo_id: "d1", fecha_hora: "2026-10-12T15:00:05Z", potencia_w: 99, voltaje_v: 128, corriente_ma: 700, encendido: false,
  });
  const d = (cliente.getQueryData(clave) as typeof RESUMEN).dispositivos[0];
  expect(d).toMatchObject({ potencia_w: 99, encendido: false, en_linea: true, ultima_lectura: "2026-10-12T15:00:05Z" });
});

it("un estado_enchufe cambia solo el encendido", () => {
  const cliente = clienteDePrueba();
  cliente.setQueryData(clave, RESUMEN);
  aplicarEvento(cliente, "h1", { tipo: "estado_enchufe", dispositivo_id: "d1", encendido: false, fecha_hora: "x" });
  expect((cliente.getQueryData(clave) as typeof RESUMEN).dispositivos[0]).toMatchObject({ encendido: false, potencia_w: 26.5 });
});

it("ignora eventos de otros dispositivos", () => {
  const cliente = clienteDePrueba();
  cliente.setQueryData(clave, RESUMEN);
  aplicarEvento(cliente, "h1", { tipo: "estado_enchufe", dispositivo_id: "otro", encendido: false, fecha_hora: "x" });
  expect((cliente.getQueryData(clave) as typeof RESUMEN).dispositivos[0].encendido).toBe(true);
});
