"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearSessionExpired, useSessionExpired } from "@/lib/auth/session";

// the axios layer cannot navigate, so it flags the expiry and this sends the visitor to the landing page
export function SessionExpiryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const expired = useSessionExpired();

  useEffect(() => {
    if (!expired) return;
    // the notice has been shown: the visitor may now browse signed out without being sent back
    if (pathname === "/session-expired" || pathname === "/login") return clearSessionExpired();
    router.replace(`/session-expired?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [expired, pathname, router]);

  return null;
}
