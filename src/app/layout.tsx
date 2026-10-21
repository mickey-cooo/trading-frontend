import type { Metadata } from "next";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { headers } from "next/headers";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { SessionExpiryRedirect } from "@/components/common/SessionExpiryRedirect";
import { StoreProvider } from "@/lib/store-provider";
import { ThemeRegistry } from "@/theme/ThemeRegistry";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ApexTrade",
  description: "Spot trading, instant swap and portfolio on one fast, eye-friendly terminal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // reading the per-request nonce makes every page render dynamically, as a nonce CSP requires
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className={`${hanken.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript nonce={nonce} attribute="data-mui-color-scheme" defaultMode="system" />
        <ThemeRegistry nonce={nonce}>
          <StoreProvider>
            <SessionExpiryRedirect />
            {children}
          </StoreProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
