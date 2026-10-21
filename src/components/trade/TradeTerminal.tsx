"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCandleFeed } from "@/hooks/trading/useCandleFeed";
import { useMarketHours } from "@/hooks/trading/useMarketHours";
import { useMarkets } from "@/hooks/trading/useMarkets";
import { usePolling } from "@/hooks/trading/usePolling";
import { useStats24h } from "@/hooks/trading/useStats24h";
import { useIsAuthed } from "@/lib/auth/session";
import { toNumber } from "@/lib/format";
import { getBalances } from "@/services/account.service";
import type { CandleInterval } from "@/types/trading";
import { CandleChart } from "./CandleChart";
import { MarketHeader } from "./MarketHeader";
import { OrderForm } from "./OrderForm";
import { OrdersDeck } from "./OrdersDeck";
import { TickTape } from "./TickTape";

export function TradeTerminal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const authed = useIsAuthed();
  const markets = useMarkets();
  const hours = useMarketHours();
  const [interval, setInterval] = useState<CandleInterval>("1m");
  const [version, setVersion] = useState(0);

  const requested = params.get("pair");
  const market = markets.data?.find((m) => m.pair === requested) ?? markets.data?.[0];

  const feed = useCandleFeed(market?.pair, interval);
  const price = feed.tick ? toNumber(feed.tick.close) : undefined;
  const { stats } = useStats24h(market?.pair, price);
  const balances = usePolling(getBalances, 5000, authed, "", version);

  const bump = () => setVersion((v) => v + 1);

  if (markets.error && !markets.data) {
    return (
      <Alert severity="error" action={<Button onClick={markets.reload}>Retry</Button>}>
        {markets.error}
      </Alert>
    );
  }
  if (!market || !markets.data) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={64} />
        <Skeleton variant="rounded" height={480} />
      </Stack>
    );
  }

  return (
    <Stack sx={{ gap: 1.5 }}>
      <MarketHeader
        markets={markets.data}
        market={market}
        onPairChange={(pair) => router.replace(`${pathname}?pair=${encodeURIComponent(pair)}`)}
        price={price}
        stats={stats}
        live={feed.live}
        closed={hours.data?.isOpen === false}
        waiting={!feed.loading && !feed.error && feed.history.length === 0}
      />
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) 340px", xl: "minmax(0,1fr) 220px 340px" },
          alignItems: "start",
        }}
      >
        <CandleChart feed={feed} interval={interval} onIntervalChange={setInterval} priceIncrement={market.priceIncrement} />
        <Box sx={{ display: { xs: "none", xl: "block" }, minWidth: 0, height: "100%" }}>
          <TickTape market={market} rows={feed.prints} />
        </Box>
        <Box sx={{ gridColumn: { md: 2, xl: 3 }, gridRow: { md: 1 } }}>
          <OrderForm key={market.pair} market={market} lastPrice={price} balances={balances.data} onPlaced={bump} />
        </Box>
      </Box>
      <OrdersDeck version={version} onChanged={bump} />
    </Stack>
  );
}
