import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/constants";
import { API_BASE_URL } from "@/lib/config";
import type { AuthTokens } from "@/types/trading";

// the backend rejected the refresh token (revoked, expired or already rotated): the login is over
export class RefreshRejected extends Error {}

export async function backend(path: string, init: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
}

async function requestRefresh(refreshToken: string): Promise<AuthTokens> {
  const res = await backend("/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (res.status === 400 || res.status === 401) throw new RefreshRejected();
  if (!res.ok) throw new Error(`refresh failed with ${res.status}`);
  return parseTokens(await res.json());
}

export function parseTokens(data: unknown): AuthTokens {
  const t = data as Partial<AuthTokens> | null;
  if (typeof t?.accessToken !== "string" || typeof t.refreshToken !== "string") throw new Error("malformed token response");
  return { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: typeof t.expiresIn === "number" ? t.expiresIn : 300 };
}

// The backend rotates refresh tokens, so a second use of one revokes the whole login. Parallel requests that all
// 401 at once share one refresh, and the result is kept briefly for stragglers that still carry the old cookie.
// shortcut: in-memory, so one Node instance only; several instances need sticky sessions or a shared lock.
const inflight = new Map<string, Promise<AuthTokens>>();
const REUSE_MS = 10_000;

export function refreshTokens(refreshToken: string) {
  let pending = inflight.get(refreshToken);
  if (!pending) {
    pending = requestRefresh(refreshToken);
    inflight.set(refreshToken, pending);
    const done = pending;
    // a failure is not kept: the next request may retry (e.g. after a network blip)
    done.then(
      () => setTimeout(() => inflight.delete(refreshToken), REUSE_MS).unref(),
      () => inflight.delete(refreshToken),
    );
  }
  return pending;
}

// the backend sets the JWT subject to the account email; display only, never used for access decisions
function emailFromToken(token: string) {
  try {
    const sub = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()).sub;
    return typeof sub === "string" && sub ? sub : undefined;
  } catch {
    return undefined;
  }
}

// Secure whenever the request came in over https, and in production for any host but loopback: a TLS-terminating
// proxy that forgets x-forwarded-proto must not downgrade the session cookies to plain http.
const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function cookieOptions(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const secure = proto === "https" || (process.env.NODE_ENV === "production" && !LOOPBACK.test(host));
  return { path: "/", sameSite: "lax", secure } as const;
}

export function setSession(response: NextResponse, request: NextRequest, tokens: AuthTokens) {
  const base = cookieOptions(request);
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...base, httpOnly: true, maxAge: tokens.expiresIn });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, httpOnly: true, maxAge: SESSION_MAX_AGE });
  response.cookies.set(SESSION_COOKIE, emailFromToken(tokens.accessToken) ?? "1", { ...base, httpOnly: false, maxAge: SESSION_MAX_AGE });
}

export function clearSession(response: NextResponse, request: NextRequest) {
  const base = cookieOptions(request);
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, SESSION_COOKIE]) response.cookies.set(name, "", { ...base, maxAge: 0 });
}

// Cookies are sent on cross-site form posts and fetches too, so a state-changing call must prove it came from this site.
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return !!origin && !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
