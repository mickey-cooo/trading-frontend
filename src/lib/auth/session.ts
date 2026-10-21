import { useSyncExternalStore } from "react";
import { SESSION_COOKIE } from "./constants";

// The tokens are HttpOnly cookies handled by /api/bff, so all this side can see is the readable flag cookie
// the server sets next to them: "someone is signed in", with their email for display.
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// tokens used to live in localStorage; drop any left behind by an older build
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  } catch {
    // blocked site data: nothing could have been stored
  }
}

function readFlag() {
  if (typeof document === "undefined") return null;
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) return null;
  const value = entry.slice(SESSION_COOKIE.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    // a malformed value (stray %) still means the flag is set; it just has no usable email
    return "1";
  }
}

function dropFlag() {
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0`;
}

// set when the server rejects the refresh token, so the UI can tell "signed out by expiry" from a log out
let expired = false;

// call after the BFF has set the cookies (login) or cleared them (logout)
export function sessionChanged() {
  expired = false;
  emit();
}

// a 401 without the expiry header can mean the login ended in another tab: re-read the flag cookie
export const recheckSession = emit;

export function expireSession() {
  dropFlag();
  expired = true;
  emit();
}

export function clearSessionExpired() {
  if (!expired) return;
  expired = false;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // shortcut: another tab's login or logout is noticed when this tab regains focus, not instantly
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
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
    () => readFlag() !== null,
    () => false,
  );
}

export function useAccountEmail() {
  const flag = useSyncExternalStore(subscribe, readFlag, () => null);
  // "1" is the flag's value when the token carried no email
  return flag && flag !== "1" ? flag : undefined;
}
