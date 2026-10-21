import { useEffect, useSyncExternalStore } from "react";
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE } from "./constants";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// proxy.ts runs on the server and cannot read localStorage, so the login is mirrored in a flag cookie
function setSessionCookie(on: boolean) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${on ? "1" : ""}; Path=/; SameSite=Lax; Max-Age=${on ? SESSION_COOKIE_MAX_AGE : 0}${secure}`;
}
export const getAccessToken = () => read(ACCESS_KEY);
export const getRefreshToken = () => read(REFRESH_KEY);

export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  try {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  } catch {
    // private mode, blocked site data or a full quota: a login that cannot be kept must fail visibly,
    // and a half-written pair (new access token, old refresh token) must not look signed in
    clearTokens();
    throw new Error("This browser blocks site storage, so you cannot stay signed in. Allow site data and try again.");
  }
  expired = false;
  setSessionCookie(true);
  emit();
}

// set when the server rejects the refresh token, so the UI can tell "signed out by expiry" from a log out
let expired = false;
export function expireSession() {
  clearTokens();
  expired = true;
  emit();
}

export function clearSessionExpired() {
  if (!expired) return;
  expired = false;
  emit();
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // nothing readable is stored, so there is nothing left to clear
  }
  setSessionCookie(false);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useSessionExpired() {
  return useSyncExternalStore(
    subscribe,
    () => expired,
    () => false,
  );
}

// false on the server and during hydration, then the real answer
export function useIsAuthed() {
  return useSyncExternalStore(
    subscribe,
    () => getRefreshToken() !== null,
    () => false,
  );
}

// the backend sets the JWT subject to the account email; display only, never used for access decisions
function emailFromToken(token: string | null) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return undefined;
    const sub = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).sub;
    return typeof sub === "string" && sub ? sub : undefined;
  } catch {
    return undefined;
  }
}

export function useAccountEmail() {
  return emailFromToken(useSyncExternalStore(subscribe, getAccessToken, () => null));
}

// heals a cookie that outlived (or lost) its tokens, e.g. after site data was cleared; mount once per page
export function useSessionCookieSync() {
  useEffect(() => setSessionCookie(read(REFRESH_KEY) !== null), []);
}
