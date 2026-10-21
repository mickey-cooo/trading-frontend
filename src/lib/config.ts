// Backend base URL, including /api/v1. The backend CORS only allows http://localhost:8005.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";
