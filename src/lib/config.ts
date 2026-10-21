// Backend base URL, including /api/v1. The BFF route calls it server side; the browser only uses it for the SSE candle stream.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

// tokens and passwords travel to this URL, so a production build must not point it at cleartext HTTP
const { protocol, hostname, origin } = new URL(API_BASE_URL);
if (process.env.NODE_ENV === "production" && protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
  throw new Error(`NEXT_PUBLIC_API_BASE_URL must use https in production, got ${protocol}//${hostname}`);
}
export const API_ORIGIN = origin;
