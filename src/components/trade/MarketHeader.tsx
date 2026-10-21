"use client";

import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Delta } from "@/components/common/Delta";
import { decimalsOf, fmt } from "@/lib/format";
import type { Stats24h } from "@/lib/stats";
import type { Market } from "@/types/trading";

interface Props {
  markets: Market[];
  market: Market;
  onPairChange: (pair: string) => void;
  price: number | undefined;
  stats: Stats24h | null;
  live: boolean;
  waiting: boolean; // connected fine, but the market has published no quote
  closed: boolean; // outside trading hours: the stream may be connected but nothing is trading
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack sx={{ gap: 0.25 }}>
      <Typography variant="overline">{label}</Typography>
      <Typography sx={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600 }}>{children}</Typography>
    </Stack>
  );
}

export function MarketHeader({ markets, market, onPairChange, price, stats, live, waiting, closed }: Props) {
  const dp = decimalsOf(market.priceIncrement);
  // colour the price by its last tick direction; derived during render, no effect needed
  const [prev, setPrev] = useState(price);
  const [dir, setDir] = useState<1 | -1 | 0>(0);
  // a new pair starts neutral: its first price must not be compared with the old pair's last
  const [pair, setPair] = useState(market.pair);
  if (market.pair !== pair) {
    setPair(market.pair);
    setPrev(price);
    setDir(0);
  } else if (price !== prev) {
    setDir(price !== undefined && prev !== undefined ? (price > prev ? 1 : price < prev ? -1 : 0) : 0);
    setPrev(price);
  }
  const hours = stats && stats.hours < 24 ? `${stats.hours}H` : "24H";

  return (
    <Paper sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: { xs: 2, md: 4 }, flexWrap: "wrap", rowGap: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
        <Select
          size="small"
          value={market.pair}
          onChange={(e) => onPairChange(e.target.value)}
          inputProps={{ "aria-label": "Trading pair" }}
          sx={{ fontWeight: 700, fontSize: "1.125rem", fontFamily: "var(--font-ui)", minWidth: 150, "& fieldset": { border: 0 }, bgcolor: "transparent" }}
        >
          {markets.map((m) => (
            <MenuItem key={m.pair} value={m.pair}>
              {m.base} / {m.quote}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="overline" sx={{ px: 0.75, py: 0.25, bgcolor: "surface", border: "1px solid var(--mui-palette-divider)", borderRadius: "4px" }}>
          Spot
        </Typography>
      </Stack>

      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
        <Typography
          aria-live="off"
          sx={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.875rem",
            fontWeight: 600,
            lineHeight: 1.1,
            minWidth: "9ch",
            color: dir === 1 ? "success.main" : dir === -1 ? "error.main" : "text.primary",
          }}
        >
          {price === undefined ? "–" : fmt(price, dp)}
        </Typography>
        {stats && <Delta value={stats.change} />}
      </Stack>

      <Stat label={`${hours} high`}>{stats ? fmt(stats.high, dp) : "–"}</Stat>
      <Stat label={`${hours} low`}>{stats ? fmt(stats.low, dp) : "–"}</Stat>

      <Box
        sx={{ ml: "auto", display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: "999px", border: "1px solid var(--mui-palette-divider)", bgcolor: "surface" }}
        role="status"
      >
        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: live && !closed ? "success.main" : "text.disabled" }} />
        <Typography variant="overline">{closed ? "Market closed" : live ? "Live stream" : waiting ? "No quote yet" : "Reconnecting"}</Typography>
      </Box>
    </Paper>
  );
}
