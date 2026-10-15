/* Genera los íconos de la app (rayo ⚡ con la paleta del mockup) sin herramientas externas: solo pngjs.
 * Uso:  node scripts/generar-iconos.js
 * Salida: assets/images/*.png y ../../services/agent/instalador/icono-mac-1024.png (el del programa de Mac). */
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const TINTA = [0x1b, 0x1a, 0x17];
const CREMA = [0xf4, 0xf1, 0xea];
const VERDE = [0x15, 0x8a, 0x4e]; // semáforo verde
const VERDE_CLARO = [0x3c, 0xcb, 0x7f]; // el mismo verde, para fondos oscuros
const NEGRO = [0, 0, 0];

// El rayo, en una caja de 0..1. Polígono simple, dibujado de arriba abajo.
const RAYO = [
  [0.62, 0.05], [0.27, 0.56], [0.47, 0.56], [0.38, 0.95], [0.76, 0.4], [0.55, 0.4], [0.69, 0.05],
];

function dentro(poligono, x, y) {
  let en = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) en = !en;
  }
  return en;
}

function dentroDeRectRedondeado(x, y, margen, radio) {
  const x0 = margen, x1 = 1 - margen, y0 = margen, y1 = 1 - margen;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + radio), x1 - radio);
  const cy = Math.min(Math.max(y, y0 + radio), y1 - radio);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radio ** 2;
}

/** capas: funciones (x, y en 0..1) → [r,g,b] o null (transparente); la última que responda gana. 4×4 muestras por píxel (bordes suaves). */
function dibujar(lado, capas, archivo) {
  const png = new PNG({ width: lado, height: lado });
  const m = 4;
  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < m; sy++) {
        for (let sx = 0; sx < m; sx++) {
          const x = (px + (sx + 0.5) / m) / lado;
          const y = (py + (sy + 0.5) / m) / lado;
          let color = null;
          for (const capa of capas) color = capa(x, y) ?? color;
          if (color) { r += color[0]; g += color[1]; b += color[2]; a += 1; }
        }
      }
      const i = (py * lado + px) * 4;
      const n = m * m;
      png.data[i] = a ? Math.round(r / a) : 0;
      png.data[i + 1] = a ? Math.round(g / a) : 0;
      png.data[i + 2] = a ? Math.round(b / a) : 0;
      png.data[i + 3] = Math.round((a / n) * 255);
    }
  }
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, PNG.sync.write(png));
  console.log("→", path.relative(process.cwd(), archivo), `${lado}×${lado}`);
}

/** El rayo ocupando `escala` de la caja, centrado. */
const rayo = (color, escala = 1) => (x, y) => {
  const u = (x - 0.5) / escala + 0.5;
  const v = (y - 0.5) / escala + 0.5;
  return dentro(RAYO, u, v) ? color : null;
};
const fondo = (color) => () => color;

const imgs = path.join(__dirname, "..", "assets", "images");
dibujar(1024, [fondo(TINTA), rayo(VERDE_CLARO, 0.62)], path.join(imgs, "icon.png")); // iOS redondea solo las esquinas
dibujar(512, [fondo(TINTA)], path.join(imgs, "android-icon-background.png"));
dibujar(512, [rayo(VERDE_CLARO, 0.5)], path.join(imgs, "android-icon-foreground.png")); // dentro de la zona segura del ícono adaptable
dibujar(432, [rayo(NEGRO, 0.5)], path.join(imgs, "android-icon-monochrome.png")); // Android lo tiñe con el color del tema
dibujar(512, [rayo(VERDE, 0.9)], path.join(imgs, "splash-icon.png")); // sobre el fondo crema de la pantalla de arranque
dibujar(48, [fondo(TINTA), rayo(VERDE_CLARO, 0.7)], path.join(imgs, "favicon.png"));
// Programa de Mac: cuadrado redondeado con margen, como los íconos de macOS
dibujar(
  1024,
  [(x, y) => (dentroDeRectRedondeado(x, y, 0.09, 0.2) ? TINTA : null), (x, y) => (dentroDeRectRedondeado(x, y, 0.09, 0.2) ? rayo(VERDE_CLARO, 0.62)(x, y) : null)],
  path.join(__dirname, "..", "..", "..", "services", "agent", "instalador", "icono-mac-1024.png"),
);
