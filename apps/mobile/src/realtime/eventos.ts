/** Eventos del WebSocket /ws/hogares/{id} (el OpenAPI no describe WebSockets; ver ADR 0003). */
export type EventoLectura = {
  tipo: "lectura";
  dispositivo_id: string;
  fecha_hora: string;
  potencia_w: number;
  voltaje_v: number;
  corriente_ma: number;
  encendido: boolean;
};

export type EventoEstadoEnchufe = {
  tipo: "estado_enchufe";
  dispositivo_id: string;
  encendido: boolean;
  fecha_hora: string;
};

export type EventoAlerta = {
  tipo: "alerta";
  id: string;
  dispositivo_id: string | null;
  alerta_tipo: string;
  nivel: "rojo" | "amarillo" | "verde";
  titulo: string;
  mensaje: string;
  fecha: string;
};

export type EventoEnVivo = EventoLectura | EventoEstadoEnchufe | EventoAlerta;

export type EstadoConexion = "conectando" | "conectado" | "reconectando" | "sin_acceso";
