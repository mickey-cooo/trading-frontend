"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Delta } from "@/components/common/Delta";
import { Panel } from "@/components/common/Panel";
import { useMarketSnapshots } from "@/hooks/trading/useMarketSnapshots";
import { decimalsOf, fmt } from "@/lib/format";
import { stats24h } from "@/lib/stats";
import type { Market } from "@/types/trading";
import type { SwapPreset } from "./SwapPanel";

const QUICK_USD = 100;

export function QuickMarkets({ markets, onPreset }: { markets: Market[]; onPreset: (p: Omit<SwapPreset, "nonce">) => void }) {
  const snaps = useMarketSnapshots(markets);
  return (
    <Panel title="1-click presets · popular markets">
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
        {(snaps.data ?? markets.map((market) => ({ market, hourly: [], quote: null }))).map(({ market, hourly, quote }) => {
          const price = Number(quote?.price ?? hourly.at(-1)?.close);
          const st = stats24h(hourly, Number.isFinite(price) ? price : undefined);
          return (
            <ButtonBase
              key={market.pair}
              onClick={() => onPreset({ pay: market.quote, receive: market.base, amount: String(QUICK_USD) })}
              aria-label={`Prepare a ${QUICK_USD} ${market.quote} swap into ${market.base}`}
              sx={{ display: "block", textAlign: "left", p: 1.25, minHeight: 64, border: "1px solid var(--mui-palette-divider)", borderRadius: "4px", bgcolor: "background.paper", "&:hover": { borderColor: "outline" }, "&:focus-visible": { boxShadow: "0 0 0 2px var(--mui-palette-primary-light)" } }}
            >
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 600 }}>
                  {market.base} / {market.quote}
                </Typography>
                {st && <Delta value={st.change} />}
              </Stack>
              <Typography sx={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "text.secondary", mt: 0.5 }}>
                {Number.isFinite(price) ? fmt(price, decimalsOf(market.priceIncrement)) : <Box component="span" sx={{ fontFamily: "var(--font-ui)" }}>No quote yet</Box>}
              </Typography>
              <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                Buy ${QUICK_USD}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
    </Panel>
  );
}
