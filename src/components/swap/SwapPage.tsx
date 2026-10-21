"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useMarkets } from "@/hooks/trading/useMarkets";
import { QuickMarkets } from "./QuickMarkets";
import { RecentActivity } from "./RecentActivity";
import { SwapPanel, type SwapPreset } from "./SwapPanel";

export function SwapPage() {
  const markets = useMarkets();
  const [preset, setPreset] = useState<SwapPreset>();
  const [version, setVersion] = useState(0);
  const active = markets.data?.filter((m) => m.status === "ACTIVE") ?? [];

  if (markets.error && !markets.data) {
    return (
      <Alert severity="error" action={<Button onClick={markets.reload}>Retry</Button>}>
        {markets.error}
      </Alert>
    );
  }
  if (!markets.data) return <Skeleton variant="rounded" height={520} sx={{ maxWidth: 520, mx: "auto" }} />;
  if (active.length === 0) return <Alert severity="info">No market is open for swaps right now.</Alert>;

  return (
    <Stack sx={{ gap: 1.5, maxWidth: 1200 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 1.5, pt: 0.5 }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>
            Instant Swap &amp; Convert
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Swap USDT and coins in one step. Each swap is a market order at the latest quote, with no fee.
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,560px) minmax(0,1fr)" }, alignItems: "start" }}>
        <SwapPanel markets={active} preset={preset} onSwapped={() => setVersion((v) => v + 1)} />
        <QuickMarkets markets={active} onPreset={(p) => setPreset({ ...p, nonce: Date.now() })} />
      </Box>
      <RecentActivity version={version} />
    </Stack>
  );
}
