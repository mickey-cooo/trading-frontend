// only same-site paths: a ?next=https://evil.example or //evil.example must not become a redirect
export function safeNext(next: string | null, fallback = "/trade") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  const url = new URL(next, "http://x");
  // back to the login form or the expiry page would look like the login did nothing
  return url.origin === "http://x" && !["/login", "/session-expired"].includes(url.pathname) ? next : fallback;
}
