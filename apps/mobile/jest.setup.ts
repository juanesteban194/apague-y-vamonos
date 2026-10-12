process.env.EXPO_PUBLIC_API_URL = "https://api.test";

jest.mock("expo-secure-store", () => {
  const guardado = new Map<string, string>();
  return {
    getItemAsync: async (k: string) => guardado.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void guardado.set(k, v),
    deleteItemAsync: async (k: string) => void guardado.delete(k),
  };
});
