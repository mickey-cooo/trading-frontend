"use client";

import Box from "@mui/material/Box";
import { useColorScheme } from "@mui/material/styles";
import { CandlestickSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useCandleFeed } from "@/hooks/trading/useCandleFeed";
import { useMarkets } from "@/hooks/trading/useMarkets";
import { toNumber } from "@/lib/format";
import { palettes } from "@/theme/theme";
import type { Candle } from "@/types/trading";

const VISIBLE_BARS = 60;

const toBar = (c: Candle) => ({
  time: c.time as UTCTimestamp,
  open: toNumber(c.open),
  high: toNumber(c.high),
  low: toNumber(c.low),
  close: toNumber(c.close),
});

// Decorative live candles from the public market feed, so a signed-out page shows the market is moving.
// Draws nothing until the feed answers: no axes, no numbers, and no made-up data when the API is down.
export function LiveBackdrop() {
  const { colorScheme } = useColorScheme();
  const palette = palettes[colorScheme === "light" ? "light" : "dark"];
  const pair = useMarkets().data?.[0]?.pair;
  const feed = useCandleFeed(pair, "1m");

  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const c = createChart(host.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" } },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      crosshair: { vertLine: { visible: false, labelVisible: false }, horzLine: { visible: false, labelVisible: false } },
      rightPriceScale: { visible: false },
      timeScale: { visible: false, rightOffset: 4 },
      handleScroll: false,
      handleScale: false,
    });
    chart.current = c;
    series.current = c.addSeries(CandlestickSeries, { priceLineVisible: false, lastValueVisible: false });
    return () => {
      c.remove();
      chart.current = series.current = null;
    };
  }, []);

  useEffect(() => {
    const up = palette.success.main;
    const down = palette.error.main;
    series.current?.applyOptions({ upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down });
  }, [palette]);

  useEffect(() => {
    if (feed.history.length === 0) return;
    series.current?.setData(feed.history.map(toBar));
    // the chart is not user-scrollable, so frame the newest bars here
    const n = feed.history.length;
    chart.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - VISIBLE_BARS), to: n + 4 });
  }, [feed.history]);

  // reduced motion keeps the snapshot and skips the live updates
  const { tick, history } = feed;
  useEffect(() => {
    // a refill can leave an older tick behind, and the chart throws on an update older than its newest bar
    if (!tick || tick === history.at(-1) || tick.time < (history.at(-1)?.time ?? 0)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    series.current?.update(toBar(tick));
  }, [tick, history]);

  return (
    <Box
      aria-hidden
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        opacity: feed.history.length ? 0.3 : 0,
        transition: "opacity 0.8s",
        // fade the edges so the card stays the focus
        maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 85%)",
      }}
    >
      <Box ref={host} sx={{ position: "absolute", inset: 0 }} />
    </Box>
  );
}
