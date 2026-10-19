/** Criterio de calidad «Accesibilidad» (requisitos del proyecto): texto ≥ 15 px y áreas de toque ≥ 44 px.
 *  Revisa el código fuente: si alguien escribe un tamaño menor, esta prueba falla antes de que llegue a un teléfono. */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { AREA_TOQUE_MIN, TEXTO_MIN, tipografia } from "@/theme";

const RAIZ = join(__dirname, "..");

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(nombre) && !nombre.endsWith(".d.ts") ? [ruta] : [];
  });
}

const FUENTES = [...archivos(join(RAIZ, "app")), ...archivos(join(RAIZ, "src"))];
const relativa = (ruta: string) => ruta.replace(RAIZ + "/", "");

it("los valores mínimos son los del criterio", () => {
  expect(TEXTO_MIN).toBe(15);
  expect(AREA_TOQUE_MIN).toBe(44);
});

it("toda la tipografía del tema es de 15 px o más", () => {
  for (const [nombre, estilo] of Object.entries(tipografia)) expect({ nombre, tamano: estilo.fontSize >= TEXTO_MIN }).toEqual({ nombre, tamano: true });
});

it("ningún fontSize del código es menor que 15", () => {
  const chicos: string[] = [];
  for (const ruta of FUENTES) {
    readFileSync(ruta, "utf8")
      .split("\n")
      .forEach((linea, i) => {
        for (const m of linea.matchAll(/fontSize:\s*(\d+)/g)) if (Number(m[1]) < TEXTO_MIN) chicos.push(`${relativa(ruta)}:${i + 1} fontSize ${m[1]}`);
      });
  }
  expect(chicos).toEqual([]);
});

it("todo Pressable declara un alto mínimo de 44 px (o usa el de Boton)", () => {
  const sinMinimo: string[] = [];
  let total = 0;
  for (const ruta of FUENTES) {
    const texto = readFileSync(ruta, "utf8");
    const lineas = texto.split("\n");
    lineas.forEach((linea, i) => {
      if (!linea.includes("<Pressable")) return;
      total += 1;
      const bloque = lineas.slice(i, i + 16).join("\n");
      const declara = /minHeight|AREA_TOQUE|height:\s*(4[4-9]|[5-9]\d)/.test(bloque);
      const enHojaDeEstilos = ruta.endsWith("Boton.tsx") && /minHeight:\s*AREA_TOQUE_MIN/.test(texto); // Boton lo declara en su StyleSheet
      if (!declara && !enHojaDeEstilos) sinMinimo.push(`${relativa(ruta)}:${i + 1}`);
    });
  }
  expect(total).toBeGreaterThan(10); // que la búsqueda realmente encuentre los Pressable
  expect(sinMinimo).toEqual([]);
});

it("las pestañas de abajo tienen texto de 15 px y 44 px de alto", () => {
  const texto = readFileSync(join(RAIZ, "app/(tabs)/_layout.tsx"), "utf8");
  expect(texto).toMatch(/tabBarLabelStyle:\s*\{\s*fontSize:\s*15/);
  expect(texto).toMatch(/tabBarItemStyle:\s*\{\s*minHeight:\s*44/);
});

it("el botón de ayuda y los botones de ícono tienen área de 44 px", () => {
  for (const archivo of ["src/components/BotonAyuda.tsx", "app/medidor.tsx"]) {
    expect(readFileSync(join(RAIZ, archivo), "utf8")).toMatch(/minWidth:\s*(44|AREA_TOQUE_MIN)[\s\S]*minHeight:\s*(44|AREA_TOQUE_MIN)/);
  }
});
