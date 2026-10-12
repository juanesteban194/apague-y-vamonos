const url = process.env.EXPO_PUBLIC_API_URL;
if (!url) {
  throw new Error("Falta EXPO_PUBLIC_API_URL (apps/mobile/.env)");
}

export const API_URL = url.replace(/\/$/, "");
export const WS_URL = API_URL.replace(/^http/, "ws"); // https → wss, http → ws
