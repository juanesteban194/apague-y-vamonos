process.env.EXPO_PUBLIC_API_URL = "https://api.test";

jest.mock("expo-secure-store", () => {
  const guardado = new Map<string, string>();
  return {
    getItemAsync: async (k: string) => guardado.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void guardado.set(k, v),
    deleteItemAsync: async (k: string) => void guardado.delete(k),
  };
});

// Navegación: las pantallas se prueban sin el árbol real de Expo Router. Cada prueba fija los parámetros de la ruta.
jest.mock("expo-router", () => {
  const { createElement } = require("react");
  const { Text } = require("react-native");
  return {
    router: { push: jest.fn(), back: jest.fn(), dismissAll: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => (globalThis as { __parametros?: object }).__parametros ?? {},
    Link: ({ children, ...props }: { children: unknown }) => createElement(Text, props, children),
  };
});

jest.mock("expo-crypto", () => {
  const nodo = require("crypto");
  return {
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    CryptoEncoding: { BASE64: "base64" },
    getRandomBytes: (n: number) => Uint8Array.from(nodo.randomBytes(n)),
    digestStringAsync: async (_algoritmo: string, texto: string) => nodo.createHash("sha256").update(texto).digest("base64"),
  };
});

jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock("expo-linking", () => ({
  createURL: (ruta: string) => `exp://127.0.0.1:8081/--/${ruta}`,
  parse: (url: string) => ({ queryParams: Object.fromEntries(new URL(url).searchParams) }),
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  setNotificationCategoryAsync: jest.fn(async () => []),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[prueba]" })),
  scheduleNotificationAsync: jest.fn(async () => "id"),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { HIGH: 4 },
}));
