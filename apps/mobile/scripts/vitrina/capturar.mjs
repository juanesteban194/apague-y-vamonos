#!/usr/bin/env node
/**
 * Vitrina de diseño: abre la app en un navegador sin ventana (Brave), con datos de ejemplo, y saca capturas de cada pantalla del tamaño
 * de un iPhone (390 × 844 a 2×). Sirve para VER el diseño sin teléfono ni simulador. No usa la API real.
 *
 * 1) En otra terminal, la app en modo web con la API falsa (déjala corriendo; recarga sola al guardar):
 *      cd apps/mobile && npm run vitrina:servidor   (sin CI=1: así recarga en caliente)
 * 2) Las capturas:
 *      node scripts/vitrina/capturar.mjs <carpeta-de-salida> [pantalla …]
 *    Sin pantallas, saca todas. Cada una sale dos veces: <nombre>.png (lo que se ve sin desplazarse) y <nombre>-completa.png (toda la página).
 *    VITRINA_URL cambia la dirección (por defecto http://localhost:8090). VITRINA_SOLO_VISTA=1 omite las capturas completas.
 */
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

import { RUTAS, SIMULACION } from "./datos.mjs";

const BASE = process.env.VITRINA_URL ?? "http://localhost:8090";
const API = "https://api.vitrina";
const NAVEGADORES = ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"];

export const PANTALLAS = [
  { nombre: "inicio", ruta: "/" },
  { nombre: "explorar", ruta: "/explorar" },
  { nombre: "avisos", ruta: "/avisos" },
  { nombre: "ajustes", ruta: "/ajustes" },
  { nombre: "consejos", ruta: "/consejos" },
  { nombre: "simulador", ruta: "/simulador?dispositivo=d1&kwh=26.3" },
  { nombre: "dispositivo", ruta: "/dispositivo/d1" },
  { nombre: "enchufes", ruta: "/enchufes" },
  { nombre: "enchufe", ruta: "/enchufe/d1" },
  { nombre: "enchufe-nuevo", ruta: "/enchufe/nuevo" },
  { nombre: "agentes", ruta: "/agentes" },
  { nombre: "agente-nuevo", ruta: "/agente/nuevo" },
  { nombre: "casas", ruta: "/casas" },
  { nombre: "casa-nueva", ruta: "/casa/nueva" },
  { nombre: "facturas", ruta: "/facturas" },
  { nombre: "historial", ruta: "/historial" },
  { nombre: "medidor", ruta: "/medidor" },
  { nombre: "prepago", ruta: "/prepago" },
  { nombre: "rutinas", ruta: "/rutinas" },
  { nombre: "rutina-nueva", ruta: "/rutina/nueva" },
  { nombre: "instrucciones", ruta: "/instrucciones" },
  { nombre: "soporte", ruta: "/soporte" },
  { nombre: "ayuda", ruta: "/ayuda/agentes" },
  { nombre: "politica", ruta: "/politica" },
  { nombre: "verificar-correo", ruta: "/verificar-correo", rutas: { "GET /auth/yo": { ...RUTAS["GET /auth/yo"], email_verificado: false } } },
  { nombre: "eliminar-cuenta", ruta: "/eliminar-cuenta" },
  { nombre: "login", ruta: "/login", sinSesion: true },
  { nombre: "registro", ruta: "/registro", sinSesion: true },
  { nombre: "recuperar", ruta: "/recuperar", sinSesion: true },
  // Estados: la app con la casa recién creada (sin datos) y sin facturas anotadas
  { nombre: "inicio-vacio", ruta: "/", rutas: { "GET /hogares/h1/resumen": { ...RUTAS["GET /hogares/h1/resumen"], dispositivos: [], equivalencias: [], costo_hoy_cop: 0, costo_mes_cop: 0, semaforo: { estado: "sin_historial", nivel: null, titulo: "Falta tu histórico", mensaje: "Anota los meses de tu factura de EPM para saber si vas por encima o por debajo de lo normal.", promedio_kwh: null, proyeccion_kwh: null, diferencia_cop: null } } } },
  { nombre: "inicio-verde", ruta: "/", rutas: { "GET /hogares/h1/resumen": { ...RUTAS["GET /hogares/h1/resumen"], semaforo: { ...RUTAS["GET /hogares/h1/resumen"].semaforo, nivel: "verde", titulo: "Vas bien", mensaje: "Si sigues así, este mes pagas unos $12.300 menos que tu promedio.", diferencia_cop: -12300 } } } },
  // Entrada: cuenta nueva de Google sin consentimiento y primera casa
  { nombre: "consentimiento", ruta: "/consentimiento", rutas: { "GET /auth/yo": { ...RUTAS["GET /auth/yo"], tiene_consentimiento: false } } },
  { nombre: "onboarding-hogar", ruta: "/hogar", rutas: { "GET /hogares": [] } },
  // Avisos sin nada pendiente y sin ningún aviso
  { nombre: "avisos-al-dia", ruta: "/avisos", rutas: { "GET /hogares/h1/alertas": RUTAS["GET /hogares/h1/alertas"].map((a) => ({ ...a, leida: true })) } },
  { nombre: "avisos-vacio", ruta: "/avisos", rutas: { "GET /hogares/h1/alertas": [] } },
  // Simulador con el resultado: llena los campos y toca «Calcular» (la respuesta es la que daría la API para estos datos)
  {
    nombre: "simulador-resultado",
    ruta: "/simulador?dispositivo=d1&kwh=45",
    rutas: { "POST /simulador/retiq": SIMULACION },
    accion: async (pagina) => {
      const campos = await pagina.$$("input");
      await campos[1].type("22");
      await campos[2].type("1400000");
      await pagina.click('[aria-label="Calcular"]');
      await esperar(1200);
    },
  },
];

const JWT = (segundos) => `cabecera.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + segundos })).toString("base64url")}.firma`;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function prepararPagina(conSesion, tokens) {
  // Corre dentro del navegador antes que la app.
  try {
    localStorage.clear();
    if (conSesion) {
      localStorage.setItem("token_acceso", tokens.acceso);
      localStorage.setItem("token_renovacion", tokens.renovacion);
      localStorage.setItem("casa_seleccionada", "h1");
      localStorage.setItem("ayuda_vista", JSON.stringify(["inicio", "enchufes", "agentes", "rutinas", "facturas", "prepago", "consejos", "simulador", "avisos", "casas"]));
    }
  } catch {}
  class WebSocketFalso {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      setTimeout(() => {
        this.readyState = 1;
        this.onopen?.({});
      }, 20);
    }
    send() {
      if (this.saludado) return;
      this.saludado = true;
      setTimeout(() => this.onmessage?.({ data: JSON.stringify({ tipo: "conectado" }) }), 20);
    }
    close() {
      this.readyState = 3;
      this.onclose?.({ code: 1000 });
    }
    addEventListener() {}
    removeEventListener() {}
  }
  // Solo el canal en vivo de la API es falso: el de Metro (recarga de la app) sigue siendo el real.
  const Real = window.WebSocket;
  function WebSocketVitrina(url, protocolos) {
    return String(url).startsWith("wss://api.vitrina") ? new WebSocketFalso(url) : new Real(url, protocolos);
  }
  Object.assign(WebSocketVitrina, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  window.WebSocket = WebSocketVitrina;
}

/** Los avisos de desarrollo de Expo (la barrita roja de abajo) no son parte del diseño: se ocultan antes de capturar.
 *  Igual quedan reportados en la consola de la vitrina («consola: …»). */
async function ocultarAvisosDeDesarrollo(pagina) {
  return pagina.evaluate(() => {
    const patron = /does not recognize|Warning:|Uncaught|is not valid|Error:/;
    let ocultos = 0;
    const visitar = (raiz) => {
      for (const el of raiz.querySelectorAll("*")) {
        if (el.shadowRoot) visitar(el.shadowRoot);
        if (el.children.length || !patron.test(el.textContent ?? "")) continue; // hojas con el texto del aviso
        let caja = el;
        while (caja && caja.parentElement && !["fixed", "absolute"].includes(getComputedStyle(caja).position)) caja = caja.parentElement;
        if (caja && caja.getBoundingClientRect().height < 220) {
          caja.style.display = "none";
          ocultos += 1;
        }
      }
    };
    visitar(document);
    return ocultos;
  });
}

async function capturar(navegador, pantalla, salida, soloVista) {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await pagina.evaluateOnNewDocument(prepararPagina, !pantalla.sinSesion, { acceso: JWT(3600), renovacion: JWT(86400) });
  await pagina.setRequestInterception(true);
  const rutas = { ...RUTAS, ...(pantalla.rutas ?? {}) };
  const sinSimular = new Set();
  pagina.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(API)) return req.continue();
    const clave = `${req.method()} ${url.slice(API.length)}`;
    if (req.method() === "OPTIONS") return req.respond({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    let estado = 200;
    let cuerpo = rutas[clave];
    if (cuerpo === undefined) {
      if (req.method() === "GET") {
        sinSimular.add(clave);
        estado = 404;
        cuerpo = { detail: `sin datos de ejemplo para ${clave}` };
      } else cuerpo = {};
    }
    req.respond({ status: estado, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(cuerpo) });
  });
  const errores = [];
  const consola = new Set();
  pagina.on("pageerror", (e) => errores.push(String(e.message ?? e).split("\n")[0]));
  pagina.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warn") consola.add(m.text().replace(/\s+/g, " ").slice(0, 220));
  });
  await pagina.goto(BASE + pantalla.ruta, { waitUntil: "networkidle0", timeout: 90_000 });
  await esperar(1400); // fuentes, animaciones de entrada
  if (pantalla.accion) await pantalla.accion(pagina);
  await ocultarAvisosDeDesarrollo(pagina);
  await pagina.screenshot({ path: `${salida}/${pantalla.nombre}.png` });
  if (!soloVista) {
    await pagina.setViewport({ width: 390, height: 3000, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await esperar(800);
    // Alto real: el borde inferior del último elemento visible del contenido (sin contar la barra de pestañas, abajo del todo).
    const alto = await pagina.evaluate(() => {
      const limite = window.innerHeight - 110;
      let fin = 0;
      for (const el of document.querySelectorAll("div, span, img, svg")) {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.width > 0 && r.height < window.innerHeight * 0.9 && r.bottom < limite) fin = Math.max(fin, r.bottom);
      }
      return Math.round(Math.min(3000, Math.max(844, fin + 48)));
    });
    await ocultarAvisosDeDesarrollo(pagina);
    await pagina.screenshot({ path: `${salida}/${pantalla.nombre}-completa.png`, clip: { x: 0, y: 0, width: 390, height: alto } });
  }
  await pagina.close();
  return { errores, sinSimular: [...sinSimular], consola: [...consola] };
}

async function principal() {
  const [salida = "capturas", ...solo] = process.argv.slice(2);
  const ejecutable = NAVEGADORES.find((r) => existsSync(r));
  if (!ejecutable) throw new Error("No encontré Brave, Chrome ni Chromium en /Applications");
  await mkdir(salida, { recursive: true });
  const navegador = await puppeteer.launch({ executablePath: ejecutable, headless: true, args: ["--disable-web-security", "--no-first-run", "--hide-scrollbars", "--lang=es-CO"] });
  const elegidas = solo.length ? PANTALLAS.filter((p) => solo.includes(p.nombre)) : PANTALLAS;
  try {
    for (const p of elegidas) {
      const t = Date.now();
      const r = await capturar(navegador, p, salida, process.env.VITRINA_SOLO_VISTA === "1");
      const notas = [
        r.errores.length ? `errores: ${r.errores.join(" | ")}` : "",
        r.sinSimular.length ? `sin datos: ${r.sinSimular.join(", ")}` : "",
        r.consola.length ? `consola: ${r.consola.join(" | ")}` : "",
      ].filter(Boolean).join(" · ");
      console.log(`✓ ${p.nombre} (${Date.now() - t} ms)${notas ? " — " + notas : ""}`);
    }
  } finally {
    await navegador.close();
  }
  console.log(`Capturas en ${salida}/`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
