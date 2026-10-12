import type { components } from "./schema";

export type Hogar = components["schemas"]["HogarOut"];
export type Resumen = components["schemas"]["ResumenOut"];
export type DispositivoResumen = components["schemas"]["DispositivoResumen"];
export type Consumo = components["schemas"]["ConsumoOut"];
export type PuntoConsumo = components["schemas"]["PuntoConsumo"];
export type Tarifa = components["schemas"]["TarifaOut"];
export type Tokens = components["schemas"]["TokensOut"];
export type Periodo = Consumo["periodo"];
export type Perfil = components["schemas"]["PerfilOut"];
export type Dispositivo = components["schemas"]["DispositivoOut"];
export type DispositivoNuevo = components["schemas"]["DispositivoIn"];
export type DispositivoCambios = components["schemas"]["DispositivoActualizarIn"];
export type Agente = components["schemas"]["AgenteOut"];
export type AgenteCreado = components["schemas"]["AgenteCreadoOut"];
export type HogarNuevo = components["schemas"]["HogarIn"];
export type HogarCambios = components["schemas"]["HogarActualizarIn"];
export type Registro = components["schemas"]["RegistroIn"];
