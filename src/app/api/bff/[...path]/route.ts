import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";
import { backend, clearSession, parseTokens, RefreshRejected, refreshTokens, sameOrigin, setSession } from "@/lib/bff/server";
import type { AuthTokens } from "@/types/trading";

// Browser -> this route -> backend. The tokens live in HttpOnly cookies and are attached here, so page script never sees them.
// proxy.ts skips /api/, so nothing else guards this route: every check below is the whole defence.
const FORWARD_REQUEST = ["accept", "accept-language", "content-type", "idempotency-key"];
const FORWARD_RESPONSE = ["content-type", "retry-after"];
const WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY = 1024 * 1024;

type Ctx = { params: Promise<{ path: string[] }> };

const problem = (status: number, detail: string, headers?: HeadersInit) => NextResponse.json({ detail }, { status, headers });

// Buffered so a refresh can replay it, so it is capped: callers can forge an Origin header and cost this server memory.
async function readBody(request: NextRequest) {
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}

function reply(upstream: Response) {
  // a redirect from the backend must not be followed or exposed
  if (upstream.status >= 300 && upstream.status < 400) return problem(502, "Unexpected response from the trading API");
  // backend bodies are now served from this origin: inert, so a stray HTML page could not run script here
  const headers = new Headers({ "cache-control": "no-store", "content-security-policy": "default-src 'none'; sandbox" });
  for (const name of FORWARD_RESPONSE) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

async function login(request: NextRequest, body: Uint8Array<ArrayBuffer>) {
  const upstream = await backend("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!upstream.ok) return reply(upstream);
  const response = new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  setSession(response, request, parseTokens(await upstream.json()));
  return response;
}

async function logout(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (refreshToken) {
    // best effort: the cookies are cleared either way, so the browser is signed out even if the backend is down
    await backend("/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(accessToken && { Authorization: `Bearer ${accessToken}` }) },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
  clearSession(response, request);
  return response;
}

async function forward(request: NextRequest, segments: string[], body?: Uint8Array<ArrayBuffer>) {
  const headers = new Headers();
  for (const name of FORWARD_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // segments are re-encoded onto the fixed backend base, so the caller cannot pick another host or climb out of it
  const path = `/${segments.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const call = (token?: string) => {
    if (token) headers.set("authorization", `Bearer ${token}`);
    return backend(path, { method: request.method, headers, body });
  };

  // auth calls (register, ...) carry their own credentials and must work with a dead session, so they never refresh
  const refreshToken = segments[0] === "auth" ? undefined : request.cookies.get(REFRESH_COOKIE)?.value;
  let accessToken = segments[0] === "auth" ? undefined : request.cookies.get(ACCESS_COOKIE)?.value;
  let fresh: AuthTokens | undefined;
  try {
    // the access cookie lapses with its token: renew before asking, rather than spending a doomed request
    if (!accessToken && refreshToken) accessToken = (fresh = await refreshTokens(refreshToken)).accessToken;
    let upstream = await call(accessToken);
    if (upstream.status === 401 && refreshToken && !fresh) {
      fresh = await refreshTokens(refreshToken);
      upstream = await call(fresh.accessToken);
    }
    const response = reply(upstream);
    if (fresh) setSession(response, request, fresh);
    return response;
  } catch (error) {
    if (!(error instanceof RefreshRejected)) throw error;
    const response = problem(401, "Session expired", { "x-session-expired": "1", "cache-control": "no-store" });
    clearSession(response, request);
    return response;
  }
}

async function handle(request: NextRequest, { params }: Ctx) {
  const { path: segments } = await params;
  if (segments.some((s) => !s || s === "." || s === ".." || /[\\/]/.test(s))) return problem(400, "Bad path");
  // cookies ride along on cross-site requests, so anything that changes state must come from this site
  if (WITH_BODY.has(request.method) && !sameOrigin(request)) return problem(403, "Cross-site request blocked");

  const body = WITH_BODY.has(request.method) ? await readBody(request) : undefined;
  if (body === null) return problem(413, "Request too large");

  const path = segments.join("/");
  // the browser never refreshes by itself: the refresh token is only ever used here, server side
  if (path === "auth/refresh") return problem(404, "Not found");
  try {
    if (request.method === "POST" && path === "auth/login") return await login(request, body ?? new Uint8Array());
    if (request.method === "POST" && path === "auth/logout") return await logout(request);
    return await forward(request, segments, body);
  } catch (error) {
    console.error("[bff]", request.method, path, error);
    return problem(502, "Cannot reach the trading API");
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
