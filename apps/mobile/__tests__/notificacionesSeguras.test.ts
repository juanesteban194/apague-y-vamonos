/** Expo Go en Android no admite expo-notifications (SDK 53+): importarla tumba la app. Estas pruebas cuidan que eso no vuelva a pasar. */
import { ExecutionEnvironment } from "expo-constants";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { cargarNotificaciones, type ModuloNotificaciones } from "@/lib/notificacionesSeguras";

const MODULO = { falso: true } as unknown as ModuloNotificaciones;

describe("cargarNotificaciones", () => {
  it("en Expo Go con Android ni siquiera intenta cargarla (cargarla ya es el error)", () => {
    const requerir = jest.fn(() => MODULO);
    expect(cargarNotificaciones({ plataforma: "android", ejecucion: ExecutionEnvironment.StoreClient }, requerir)).toBeNull();
    expect(requerir).not.toHaveBeenCalled();
  });

  it("en Android con una compilación propia sí la carga", () => {
    expect(cargarNotificaciones({ plataforma: "android", ejecucion: ExecutionEnvironment.Standalone }, () => MODULO)).toBe(MODULO);
    expect(cargarNotificaciones({ plataforma: "android", ejecucion: ExecutionEnvironment.Bare }, () => MODULO)).toBe(MODULO);
  });

  it("en iPhone con Expo Go sí la carga (ahí funciona: notificaciones locales)", () => {
    expect(cargarNotificaciones({ plataforma: "ios", ejecucion: ExecutionEnvironment.StoreClient }, () => MODULO)).toBe(MODULO);
  });

  it("si cargarla falla por lo que sea, devuelve null en vez de tumbar la app", () => {
    const rota = () => {
      throw new Error("expo-notifications: Android Push notifications … removed from Expo Go");
    };
    expect(cargarNotificaciones({ plataforma: "ios", ejecucion: undefined }, rota)).toBeNull();
    expect(cargarNotificaciones({ plataforma: "android", ejecucion: ExecutionEnvironment.Standalone }, rota)).toBeNull();
  });
});

describe("las funciones de notificaciones sin el módulo", () => {
  beforeEach(() => jest.resetModules());

  function sinModulo() {
    jest.doMock("@/lib/notificacionesSeguras", () => ({ notificaciones: () => null }));
    return require("@/features/alertas/notificaciones") as typeof import("@/features/alertas/notificaciones");
  }

  it("preparar, pedir permiso, registrar el push y mostrar un aviso no fallan y no hacen nada", async () => {
    const n = sinModulo();
    await expect(n.prepararNotificaciones()).resolves.toBeUndefined();
    await expect(n.tienePermiso(true)).resolves.toBe(false);
    await expect(n.registrarPush()).resolves.toBe(false);
    await expect(n.mostrarAvisoLocal({ id: "a", titulo: "t", mensaje: "m", nivel: "rojo", dispositivo_id: null, alerta_tipo: "alto_riesgo" } as never)).resolves.toBeUndefined();
  });
});

describe("nadie importa expo-notifications directamente", () => {
  const RAIZ = join(__dirname, "..");
  const archivos = (carpeta: string): string[] =>
    readdirSync(carpeta).flatMap((n) => {
      const ruta = join(carpeta, n);
      return statSync(ruta).isDirectory() ? archivos(ruta) : /\.tsx?$/.test(n) ? [ruta] : [];
    });

  it("solo notificacionesSeguras.ts la pide (y solo con require perezoso o como tipo)", () => {
    const culpables: string[] = [];
    for (const ruta of [...archivos(join(RAIZ, "app")), ...archivos(join(RAIZ, "src"))]) {
      if (ruta.endsWith("notificacionesSeguras.ts")) continue;
      readFileSync(ruta, "utf8")
        .split("\n")
        .forEach((linea, i) => {
          if (/from\s+["']expo-notifications["']/.test(linea) && !/^\s*import\s+type/.test(linea)) culpables.push(`${ruta.replace(RAIZ + "/", "")}:${i + 1}`);
          if (/require\(["']expo-notifications["']\)/.test(linea)) culpables.push(`${ruta.replace(RAIZ + "/", "")}:${i + 1}`);
        });
    }
    expect(culpables).toEqual([]);
  });

  it("el módulo seguro la carga de forma perezosa (no con un import de arriba)", () => {
    const texto = readFileSync(join(RAIZ, "src/lib/notificacionesSeguras.ts"), "utf8");
    expect(texto).not.toMatch(/^import .* from ["']expo-notifications["']/m);
    expect(texto).toMatch(/require\("expo-notifications"\)/);
  });
});
