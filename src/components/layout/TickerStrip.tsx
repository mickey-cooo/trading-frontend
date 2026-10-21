"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import Link from "next/link";
import { Delta } from "@/components/common/Delta";
import { useMarketSnapshots } from "@/hooks/trading/useMarketSnapshots";
import { useMarkets } from "@/hooks/trading/useMarkets";
import { decimalsOf, fmt } from "@/lib/format";
import { stats24h } from "@/lib/stats";

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

// Live price + 24h change for every listed market (derived from hourly candles).
export function TickerStrip() {
  const markets = useMarkets();
  const snaps = useMarketSnapshots(markets.data);
  const data = snaps.data;
  if (!data?.length) return null;
  // Items render twice so a -50% shift loops seamlessly; the copy is hidden from AT.
  const items = (hidden: boolean) =>
    data.map(({ market, hourly, quote }) => {
      const price = Number(quote?.price ?? hourly.at(-1)?.close);
      const st = stats24h(hourly, Number.isFinite(price) ? price : undefined);
      return (
        <Stack key={market.pair} component={Link} href={`/trade?pair=${market.pair}`} tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined} direction="row" sx={{ gap: 0.75, alignItems: "baseline", textDecoration: "none", color: "inherit", fontFamily: "var(--font-mono)", fontSize: "0.75rem", pr: 2, flexShrink: 0 }}>
          <Typography component="span" sx={{ color: "text.secondary", fontSize: "inherit", fontFamily: "inherit" }}>
            {market.base}/{market.quote}
          </Typography>
          <Typography component="span" sx={{ fontWeight: 600, fontSize: "inherit", fontFamily: "inherit" }}>
            {Number.isFinite(price) ? fmt(price, Math.min(decimalsOf(market.priceIncrement), 2)) : "–"}
          </Typography>
          {st && <Delta value={st.change} plain />}
        </Stack>
      );
    });
  return (
    <Stack
      direction="row"
      aria-label="Market prices"
      sx={{
        px: 1.5, py: 0.75, bgcolor: "background.default", border: "1px solid var(--mui-palette-divider)", borderRadius: "4px", overflow: "hidden", width: "100%",
        "&:hover > div, &:focus-within > div": { animationPlayState: "paused" },
      }}
    >
      <Stack
        direction="row"
        sx={{ width: "max-content", animation: `${scroll} ${data.length * 6}s linear infinite`, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }}
      >
        {items(false)}
        {items(true)}
      </Stack>
    </Stack>
  );
}
