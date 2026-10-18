/** Datos de ejemplo de la vitrina de diseño: una casa de Medellín creíble, como la del mockup. No es la API real. */
const ahora = Date.now();
const hace = (min) => new Date(ahora - min * 60_000).toISOString();
const en = (dias) => new Date(ahora + dias * 86_400_000).toISOString();
const hoy = new Date(ahora);
const mesIso = (desfase) => {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - desfase, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export const TARIFA = { estrato: 3, mes: mesIso(0), cop_kwh_subsistencia: 814.63, cop_kwh_sobre_subsistencia: 958.38, fuente: "EPM", es_del_mes_actual: true };
export const PERFIL = { id: "u1", email: "ana.restrepo@gmail.com", nombre: "Ana Restrepo", tiene_consentimiento: true, tiene_contrasena: true, tiene_google: true, email_verificado: true };
export const HOGAR = { id: "h1", nombre: "Casa Restrepo", barrio: "Manrique, Medellín", estrato: 3, tipo_medidor: "prepago", limite_subsistencia_kwh: 130, rol: "titular" };
export const HOGAR_2 = { id: "h2", nombre: "Apartamento de mamá", barrio: "Belén", estrato: 4, tipo_medidor: "pospago", limite_subsistencia_kwh: 130, rol: "titular" };

const resumenDisp = (id, nombre, encendido, potencia, hoyCop, mesCop, extra = {}) => ({
  id, nombre, encendido, potencia_w: potencia, ultima_lectura: encendido == null ? null : hace(0.05), en_linea: encendido != null,
  kwh_hoy: hoyCop / 814.63, kwh_mes: mesCop / 814.63, costo_hoy_cop: hoyCop, costo_mes_cop: mesCop, ...extra,
});

export const DISPOSITIVOS_RESUMEN = [
  resumenDisp("d1", "Nevera", true, 92.4, 1280, 21400),
  resumenDisp("d2", "Televisor de la sala", true, 68.2, 640, 9800),
  resumenDisp("d3", "Computador", false, 0, 210, 4300),
  resumenDisp("d4", "Lavadora", null, null, 0, 0),
];

export const RESUMEN = {
  hogar_id: "h1",
  calculado_en: hace(0),
  tarifa: TARIFA,
  kwh_hoy: 2.62,
  kwh_mes: 38.3,
  costo_hoy_cop: 2130,
  costo_mes_cop: 35500,
  subsistencia: { limite_kwh: 130, consumo_kwh: 96.2, porcentaje: 96.2 / 130, fuente: "medidor", nivel: "verde" },
  semaforo: {
    estado: "ok", nivel: "amarillo", titulo: "Vas medio alto",
    mensaje: "Si sigues así, este mes pagas unos $6.400 más que tu promedio.",
    promedio_kwh: 168, proyeccion_kwh: 181, diferencia_cop: 6400,
  },
  equivalencias: [
    { texto: "Es como dejar el televisor de la sala prendido 21 horas.", icono: "tv" },
    { texto: "O cargar el celular 340 veces.", icono: "plug" },
  ],
  dispositivos: DISPOSITIVOS_RESUMEN,
};

export const DISPOSITIVOS = [
  { id: "d1", tuya_id: "eb182b7a119cf6aaeecf66", nombre: "Nevera", tipo_aparato: "Nevera", alto_riesgo: false, umbral_minutos_encendido: null, agente_id: "a1", factor_calibracion: 0.9167, calibracion_referencia_w: 44 },
  { id: "d2", tuya_id: "eb7c1d0a8f3b2c4d5e6f70", nombre: "Televisor de la sala", tipo_aparato: "Televisor", alto_riesgo: false, umbral_minutos_encendido: null, agente_id: "a1", factor_calibracion: 1, calibracion_referencia_w: null },
  { id: "d3", tuya_id: "eb11223344556677889900", nombre: "Computador", tipo_aparato: "Computador", alto_riesgo: false, umbral_minutos_encendido: null, agente_id: "a1", factor_calibracion: 1, calibracion_referencia_w: null },
  { id: "d4", tuya_id: "ebaabbccddeeff00112233", nombre: "Lavadora", tipo_aparato: "Lavadora", alto_riesgo: true, umbral_minutos_encendido: 90, agente_id: null, factor_calibracion: 1, calibracion_referencia_w: null },
];

export const AGENTES = [
  { id: "a1", nombre: "Computador de la casa", ultima_conexion: hace(0.1), creado_en: hace(60 * 24 * 6), codigo_pendiente: false, vinculado: true, conectado: true, enchufes: [{ id: "d1", nombre: "Nevera" }, { id: "d2", nombre: "Televisor de la sala" }, { id: "d3", nombre: "Computador" }] },
  { id: "a2", nombre: "Portátil del estudio", ultima_conexion: hace(60 * 26), creado_en: hace(60 * 24 * 2), codigo_pendiente: false, vinculado: true, conectado: false, enchufes: [] },
];

export const ALERTAS = [
  { id: "al1", dispositivo_id: "d4", dispositivo_nombre: "Lavadora", tipo: "alto_riesgo", nivel: "rojo", titulo: "La lavadora lleva 2 horas prendida", mensaje: "Superó los 90 minutos que elegiste. Si ya terminó, apagarla te ahorra unos $90 por hora.", fecha: hace(20), leida: false },
  { id: "al2", dispositivo_id: "d1", dispositivo_nombre: "Nevera", tipo: "consumo_anomalo", nivel: "amarillo", titulo: "La nevera gastó 18 % más ayer de lo normal", mensaje: "A veces pasa cuando queda mal cerrada o le falta limpieza atrás. Si sigue así, te cuesta unos $3.800 más al mes.", fecha: hace(60 * 20), leida: false },
  { id: "al3", dispositivo_id: null, dispositivo_nombre: null, tipo: "subsistencia", nivel: "amarillo", titulo: "Te acercas a la línea de subsistencia", mensaje: "Vas en el 80 % de la energía que EPM te subsidia este mes. Pasada esa línea, cada kWh cuesta más.", fecha: hace(60 * 50), leida: true },
  { id: "al4", dispositivo_id: null, dispositivo_nombre: null, tipo: "prepago", nivel: "verde", titulo: "Tu saldo alcanza para 8 días", mensaje: "Al ritmo de los últimos 3 días te alcanza hasta el jueves.", fecha: hace(60 * 24 * 3), leida: true },
];

export const CONSEJOS = [
  { id: "noche-d2", tipo: "rutina", icono: "moon", titulo: "El televisor gasta de noche", mensaje: "Entre las 11 p. m. y las 5 a. m. sigue encendido. Programar que se apague solo te ahorra cada mes.", ahorro_cop_mes: 9800, accion: "rutina", dispositivo_id: "d2", consumo_kwh_mes: null },
  { id: "espera-d3", tipo: "consumo", icono: "plug", titulo: "El computador consume apagado", mensaje: "En espera gasta poquito, pero todos los días. Desconéctalo cuando no lo uses.", ahorro_cop_mes: 2100, accion: "rutina", dispositivo_id: "d3", consumo_kwh_mes: null },
  { id: "retiq-d1", tipo: "retiq", icono: "swap", titulo: "¿Te conviene cambiar la nevera?", mensaje: "Gasta unos $21.400 al mes. Compárala con una nueva de etiqueta A.", ahorro_cop_mes: null, accion: "simulador", dispositivo_id: "d1", consumo_kwh_mes: 26.3 },
];

export const PREPAGO = {
  estado: "ok", saldo_cop: 28500, registrado_en: hace(60 * 5), promedio_diario_cop: 3500, dias_restantes: 8.1, se_acaba_el: en(8.1), nivel: "verde",
  registros: [
    { saldo_cop: 28500, registrado_en: hace(60 * 5) },
    { saldo_cop: 32100, registrado_en: hace(60 * 29) },
    { saldo_cop: 35400, registrado_en: hace(60 * 53) },
  ],
};

export const RUTINAS = [
  { id: "r1", dispositivo_id: "d2", dispositivo_nombre: "Televisor de la sala", dias: [0, 1, 2, 3, 4, 5, 6], hora_apagado: "23:30:00", hora_encendido: null, activa: true, ahorro_estimado_cop_mes: null, ultima_ejecucion: { fecha: hace(60 * 11), resultado: "ok", accion: "apagar" } },
  { id: "r2", dispositivo_id: "d3", dispositivo_nombre: "Computador", dias: [0, 1, 2, 3, 4], hora_apagado: "22:00:00", hora_encendido: "07:00:00", activa: true, ahorro_estimado_cop_mes: 2100, ultima_ejecucion: null },
];

export const HISTORIAL = {
  meses: [5, 4, 3, 2, 1, 0].map((d, i) => ({ mes: mesIso(d + 1), kwh: [170, 194, 194, 152, 168, 182][i], valor_cop: [138500, 158000, 158000, 123800, 136900, 148200][i] })),
  meses_usados: 6, promedio_kwh: 176.7, promedio_cop: 143900,
};

export const LECTURAS_MEDIDOR = [
  { id: "l2", lectura_kwh: 45334.2, fecha: new Date(ahora).toISOString().slice(0, 10) },
  { id: "l1", lectura_kwh: 45238.0, fecha: mesIso(0) },
];

const serieDia = Array.from({ length: 24 }, (_, h) => {
  const base = [8, 7, 7, 7, 7, 8, 12, 18, 16, 14, 14, 15, 17, 15, 14, 14, 16, 20, 28, 34, 36, 30, 20, 11][h];
  const kwh = h <= hoy.getHours() ? base / 1000 * 4 : 0;
  return { inicio: `${new Date(ahora).toISOString().slice(0, 10)}T${String(h).padStart(2, "0")}:00:00-05:00`, kwh, costo_cop: Math.round(kwh * 814.63) };
});
export const CONSUMO = {
  dia: { dispositivo_id: "d1", periodo: "dia", desde: hace(60 * 12), hasta: hace(0), tarifa_mes: mesIso(0), kwh_total: serieDia.reduce((a, p) => a + p.kwh, 0), costo_total_cop: serieDia.reduce((a, p) => a + p.costo_cop, 0), serie: serieDia },
  semana: { dispositivo_id: "d1", periodo: "semana", desde: hace(60 * 24 * 7), hasta: hace(0), tarifa_mes: mesIso(0), kwh_total: 11.2, costo_total_cop: 9124, serie: [1.5, 1.7, 1.6, 1.8, 1.4, 1.6, 1.6].map((kwh, i) => ({ inicio: hace(60 * 24 * (6 - i)), kwh, costo_cop: Math.round(kwh * 814.63) })) },
  // «Mes»: un punto por mes, los últimos 12 (como la API). El enchufe se conectó hace 3 meses; el actual va hasta hoy ($21.400, igual que el resumen).
  mes: (() => {
    const costos = [0, 0, 0, 0, 0, 0, 0, 0, 12400, 27900, 25300, 21400];
    const serie = costos.map((costo_cop, i) => {
      const f = new Date(hoy.getFullYear(), hoy.getMonth() - (11 - i), 1);
      return { inicio: `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-01T00:00:00-05:00`, kwh: costo_cop / 900, costo_cop };
    });
    return { dispositivo_id: "d1", periodo: "mes", desde: serie[0].inicio, hasta: hace(0), tarifa_mes: mesIso(0), kwh_total: serie.reduce((a, p) => a + p.kwh, 0), costo_total_cop: costos.reduce((a, c) => a + c, 0), serie };
  })(),
};

/** Respuesta para cada ruta GET de la API. Lo que no está aquí responde 404 (y la app debe manejarlo con gracia). */
/** Resultado del simulador para una nevera de 45 kWh al mes contra una nueva de 22 kWh que cuesta $1.400.000, con la fórmula de la API
 *  (services/api/app/modules/retiq/service.py): tasa 12 % anual y 10 años. */
export const SIMULACION = (() => {
  const precioKwh = 958.38;
  const ahorroKwh = 45 - 22;
  const ahorro = ahorroKwh * precioKwh;
  const meses = 1_400_000 / ahorro;
  const i = 1.12 ** (1 / 12) - 1;
  const vpn = -1_400_000 + (ahorro * (1 - (1 + i) ** -120)) / i;
  const total = Math.round(meses);
  return {
    ahorro_kwh_mes: ahorroKwh, ahorro_cop_mes: Math.round(ahorro * 100) / 100, precio_kwh_usado: precioKwh, conviene: vpn > 0,
    meses_recuperacion: Math.round(meses * 10) / 10, texto_recuperacion: `${Math.floor(total / 12)} años y ${total % 12} meses`,
    vpn_cop: Math.round(vpn * 100) / 100, pagado_en_vida_util: meses <= 120,
  };
})();

export const RUTAS = {
  "GET /auth/yo": PERFIL,
  "GET /hogares": [HOGAR, HOGAR_2],
  "GET /hogares/h1/resumen": RESUMEN,
  "GET /hogares/h1/tarifa": TARIFA,
  "GET /hogares/h1/dispositivos": DISPOSITIVOS,
  "GET /hogares/h1/agentes": AGENTES,
  "GET /hogares/h1/alertas": ALERTAS,
  "GET /hogares/h1/preferencias-alertas": { sensibilidad: "normal" },
  "GET /hogares/h1/consejos": CONSEJOS,
  "GET /hogares/h1/prepago": PREPAGO,
  "GET /hogares/h1/rutinas": RUTINAS,
  "GET /hogares/h1/historial-consumo": HISTORIAL,
  "GET /hogares/h1/lecturas-medidor": LECTURAS_MEDIDOR,
  "GET /dispositivos/d1/consumo?periodo=dia": CONSUMO.dia,
  "GET /dispositivos/d1/consumo?periodo=semana": CONSUMO.semana,
  "GET /dispositivos/d1/consumo?periodo=mes": CONSUMO.mes,
};
