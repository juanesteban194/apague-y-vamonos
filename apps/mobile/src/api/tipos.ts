import type { components } from "./schema";

export type Hogar = components["schemas"]["HogarOut"];
export type Resumen = components["schemas"]["ResumenOut"];
export type DispositivoResumen = components["schemas"]["DispositivoResumen"];
export type Consumo = components["schemas"]["ConsumoOut"];
export type PuntoConsumo = components["schemas"]["PuntoConsumo"];
export type Tarifa = components["schemas"]["TarifaOut"];
export type Tokens = components["schemas"]["TokensOut"];
export type Periodo = Consumo["periodo"];
