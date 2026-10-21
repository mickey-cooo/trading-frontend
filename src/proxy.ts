import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { API_ORIGIN } from "@/lib/config";

const PROTECTED = /^\/(portfolio|profile|admin)(\/|$)/;

// Per-request nonce CSP: tokens live in localStorage, so an injected script is the way to steal them.
// style attributes stay inline (cannot run script); <style> tags need the nonce (Emotion gets it in ThemeRegistry).
function csp(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${API_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

// Optimistic gate: the tokens sit in localStorage, so the server only sees a flag cookie
// that the client sets. It stops signed-out visitors from loading these pages; the API
// still checks the Bearer token on every request.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PROTECTED.test(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    // cloning nextUrl keeps the public origin and basePath, which request.url loses behind a reverse proxy
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

// Link prefetches skip the proxy, so a signed-out redirect is never cached in the client router and replayed after login.
// Only /api/* route handlers skip it (the trailing slash keeps /apiary and the like covered): they get no CSP and
// no session gate, so each one must check auth itself.
export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
