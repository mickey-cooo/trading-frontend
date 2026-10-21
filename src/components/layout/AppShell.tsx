"use client";

import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import CandlestickChartOutlined from "@mui/icons-material/CandlestickChartOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import Search from "@mui/icons-material/Search";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import OutlinedInput from "@mui/material/OutlinedInput";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import useMediaQuery from "@mui/material/useMediaQuery";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/common/Logo";
import { MarketHoursBanner } from "@/components/common/MarketHoursBanner";
import { useApiLatency } from "@/hooks/trading/useApiLatency";
import { usePolling } from "@/hooks/trading/usePolling";
import { useIsAuthed, useSessionCookieSync } from "@/lib/auth/session";
import { fmt } from "@/lib/format";
import { getBalances } from "@/services/account.service";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";
import { TickerStrip } from "./TickerStrip";

const NAV = [
  { href: "/trade", label: "Trade Terminal", short: "Terminal", icon: <CandlestickChartOutlined fontSize="small" /> },
  { href: "/markets", label: "Markets", short: "Markets", icon: <InsightsOutlined fontSize="small" /> },
  { href: "/swap", label: "Instant Swap", short: "Swap", icon: <SwapHorizOutlined fontSize="small" /> },
  { href: "/portfolio", label: "Portfolio", short: "Portfolio", icon: <AccountBalanceWalletOutlined fontSize="small" /> },
];
const SIDEBAR = 224;
const HEADER = 56;

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <OutlinedInput
      size="small"
      value={q}
      placeholder="Search pairs, tokens…"
      onChange={(e) => setQ(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && q.trim()) router.push(`/markets?q=${encodeURIComponent(q.trim())}`);
      }}
      startAdornment={
        <InputAdornment position="start">
          <Search fontSize="small" />
        </InputAdornment>
      }
      inputProps={{ "aria-label": "Search pairs" }}
      sx={{ display: { xs: "none", md: "flex" }, width: { md: 150, lg: 190 }, bgcolor: "background.default", fontFamily: "var(--font-ui)", "& input": { fontFamily: "var(--font-ui)", fontSize: "0.75rem" } }}
    />
  );
}

function BalanceChip() {
  useSessionCookieSync();
  const authed = useIsAuthed();
  const balances = usePolling(getBalances, 10_000, authed);
  if (!authed) return null;
  const usdt = balances.data?.find((b) => b.asset === "USDT")?.available;
  return (
    <Stack direction="row" sx={{ display: { xs: "none", sm: "flex" }, gap: 0.75, alignItems: "baseline", px: 1, py: 0.5, bgcolor: "background.default", border: "1px solid var(--mui-palette-divider)", borderRadius: "4px" }}>
      <Typography variant="overline">Balance</Typography>
      <Typography sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 600 }}>{usdt ? fmt(usdt, 2) : "–"}</Typography>
      <Typography variant="overline" sx={{ color: "primary.main" }}>
        USDT
      </Typography>
    </Stack>
  );
}

function LatencyBox() {
  const ms = useApiLatency();
  const ok = ms !== undefined && ms < 150;
  return (
    <Box sx={{ mx: 1.5, mb: 2, p: 1, bgcolor: "background.default", border: "1px solid var(--mui-palette-divider)", borderRadius: "8px" }}>
      <Typography variant="overline">API latency</Typography>
      <Stack direction="row" sx={{ alignItems: "center", gap: 0.75, mt: 0.5, fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 600, color: ok ? "success.main" : "text.secondary" }}>
        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: ok ? "success.main" : "text.disabled" }} />
        {ms === undefined ? "measuring…" : `${ms} ms`}
      </Stack>
    </Box>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // hidden panels must not poll, so they are not rendered below their breakpoint
  const wide = useMediaQuery((t) => t.breakpoints.up("xl"));
  const desktop = useMediaQuery((t) => t.breakpoints.up("lg"));
  const current = NAV.find((n) => pathname.startsWith(n.href))?.href ?? false;

  return (
    <Box sx={{ minHeight: "100dvh" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ bgcolor: "rgb(from var(--mui-palette-background-paper) r g b / 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--mui-palette-divider)", boxShadow: "none", backgroundImage: "none", zIndex: 40 }}
      >
        <Toolbar sx={{ gap: 2, minHeight: `${HEADER}px !important`, px: { xs: 1.5, md: 2 } }}>
          <Stack component={Link} href="/trade" direction="row" sx={{ alignItems: "center", gap: 1, color: "text.primary", textDecoration: "none", flexShrink: 0 }} aria-label="ApexTrade home">
            <Logo />
            <Typography variant="h3" component="span" sx={{ fontWeight: 700 }}>
              ApexTrade
            </Typography>
          </Stack>
          {wide && (
            <Box sx={{ flex: "0 1 420px", minWidth: 0 }}>
              <TickerStrip />
            </Box>
          )}
          <Stack component="nav" aria-label="Primary" direction="row" sx={{ display: { xs: "none", lg: "flex" }, gap: 2.5, ml: 1 }}>
            {NAV.map((n) => (
              <Typography
                key={n.href}
                component={Link}
                href={n.href}
                variant="body2"
                aria-current={current === n.href ? "page" : undefined}
                sx={{ textDecoration: "none", color: current === n.href ? "primary.main" : "text.secondary", fontWeight: current === n.href ? 700 : 500, "&:hover": { color: "text.primary" }, minHeight: 44, display: "flex", alignItems: "center" }}
              >
                {n.label}
              </Typography>
            ))}
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <SearchBox />
          <BalanceChip />
          <ThemeToggle />
          <AccountMenu />
        </Toolbar>
      </AppBar>

      <Box
        component="aside"
        sx={{ display: { xs: "none", lg: "flex" }, flexDirection: "column", position: "fixed", left: 0, top: HEADER, bottom: 0, width: SIDEBAR, bgcolor: "background.paper", borderRight: "1px solid var(--mui-palette-divider)", zIndex: 30 }}
      >
        <List component="nav" aria-label="Workspace" sx={{ flex: 1, px: 1, pt: 2 }}>
          {NAV.map((n) => (
            <ListItemButton
              key={n.href}
              component={Link}
              href={n.href}
              selected={current === n.href}
              sx={{ borderRadius: "4px", mb: 0.5, minHeight: 40, "&.Mui-selected": { bgcolor: "rgb(from var(--mui-palette-primary-main) r g b / 0.08)", color: "primary.main", fontWeight: 700 } }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>{n.icon}</ListItemIcon>
              <ListItemText primary={n.short} slotProps={{ primary: { sx: { fontWeight: "inherit", fontSize: "0.875rem" } } }} />
            </ListItemButton>
          ))}
        </List>
        {desktop && <LatencyBox />}
      </Box>

      <Box component="main" sx={{ pt: `${HEADER}px`, pl: { lg: `${SIDEBAR}px` }, minHeight: "100dvh" }}>
        <Box sx={{ p: { xs: 1.5, md: 1.5, lg: 1.5 }, pb: { xs: 9, md: 1.5 } }}>
          <MarketHoursBanner />
          {children}
        </Box>
      </Box>

      <Paper component="nav" aria-label="Primary mobile" sx={{ display: { xs: "block", lg: "none" }, position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, borderRadius: 0, borderWidth: "1px 0 0", boxShadow: "none" }}>
        <BottomNavigation showLabels value={current}>
          {NAV.map((n) => (
            <BottomNavigationAction key={n.href} component={Link} href={n.href} value={n.href} label={n.short} icon={n.icon} sx={{ minHeight: 56 }} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
