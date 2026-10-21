"use client";

import CandlestickChartOutlined from "@mui/icons-material/CandlestickChartOutlined";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  TickMarkType,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { CandleFeed } from "@/hooks/trading/useCandleFeed";
import { palettes } from "@/theme/theme";
import { decimalsOf, fmt, fmtPct, toNumber } from "@/lib/format";
import { ema, macd, rsi } from "@/lib/indicators";
import type { Candle, CandleInterval } from "@/types/trading";

export type IndicatorKey = "ema20" | "ema50" | "ema200" | "rsi" | "macd";
const INDICATORS: { key: IndicatorKey; label: string }[] = [
  { key: "ema20", label: "EMA 20" },
  { key: "ema50", label: "EMA 50" },
  { key: "ema200", label: "EMA 200" },
  { key: "rsi", label: "RSI (14)" },
  { key: "macd", label: "MACD (12,26,9)" },
];
const EMA_PERIOD = { ema20: 20, ema50: 50, ema200: 200 } as const;
// the backend serves 1m, 5m and 1h candles only
const INTERVALS: CandleInterval[] = ["1m", "5m", "1h"];

// indicator hues stay off green/red, which belong to price direction
const LINE = {
  light: { ema20: "#0284C7", ema50: "#B45309", ema200: "#7C3AED", rsi: "#7C3AED", macd: "#0284C7", signal: "#B45309" },
  dark: { ema20: "#38BDF8", ema50: "#FBBF24", ema200: "#A78BFA", rsi: "#A78BFA", macd: "#38BDF8", signal: "#FBBF24" },
};

interface Props {
  feed: CandleFeed;
  interval: CandleInterval;
  onIntervalChange: (i: CandleInterval) => void;
  priceIncrement: string;
}

type Point = { time: UTCTimestamp; value: number };
const toPoints = (times: number[], values: number[]): Point[] =>
  values.flatMap((v, i) => (Number.isFinite(v) ? [{ time: times[i] as UTCTimestamp, value: v }] : []));

// candle times are unix seconds; lightweight-charts would label them in UTC, so format in local time
const localTime = (t: Time, opts: Intl.DateTimeFormatOptions, locale?: string) =>
  new Date((t as number) * 1000).toLocaleString(locale, { hourCycle: "h23", ...opts });
const TICK_FORMAT: Record<TickMarkType, Intl.DateTimeFormatOptions> = {
  [TickMarkType.Year]: { year: "numeric" },
  [TickMarkType.Month]: { month: "short" },
  [TickMarkType.DayOfMonth]: { day: "numeric", month: "short" },
  [TickMarkType.Time]: { hour: "2-digit", minute: "2-digit" },
  [TickMarkType.TimeWithSeconds]: { hour: "2-digit", minute: "2-digit", second: "2-digit" },
};

// the one place a live tick is folded into a candle list; returns `list` itself when the tick is stale or already its last
const mergeTick = (list: Candle[], tick: Candle | undefined): Candle[] => {
  const last = list.at(-1);
  if (!tick || tick === last || (last && tick.time < last.time)) return list;
  return last && tick.time === last.time ? [...list.slice(0, -1), tick] : [...list, tick];
};

type IndicatorSeries = Partial<Record<string, ISeriesApi<"Line" | "Histogram">>>;
type EmaKey = keyof typeof EMA_PERIOD;
const EMA_KEYS = Object.keys(EMA_PERIOD) as EmaKey[];
// the chart series each indicator owns
const SERIES: Record<IndicatorKey, string[]> = {
  ema20: ["ema20"],
  ema50: ["ema50"],
  ema200: ["ema200"],
  rsi: ["rsi"],
  macd: ["macd", "macdLine", "macdSignal"],
};

const toBar = (c: Candle) => ({
  time: c.time as UTCTimestamp,
  open: toNumber(c.open),
  high: toNumber(c.high),
  low: toNumber(c.low),
  close: toNumber(c.close),
});

// every switched-on indicator, computed once per candle list and shared by the chips and the chart
interface Computed {
  times: number[];
  ema: Partial<Record<EmaKey, number[]>>;
  rsi?: number[];
  macd?: ReturnType<typeof macd>;
}
function compute(list: Candle[], on: Set<IndicatorKey>): Computed {
  const closes = list.map((c) => toNumber(c.close));
  const out: Computed = { times: list.map((c) => c.time), ema: {} };
  EMA_KEYS.forEach((k) => {
    if (on.has(k)) out.ema[k] = ema(closes, EMA_PERIOD[k]);
  });
  if (on.has("rsi")) out.rsi = rsi(closes);
  if (on.has("macd")) out.macd = macd(closes);
  return out;
}

// `full` replaces every point; otherwise only the newest point is pushed, since a tick changes no earlier value
function paint(s: IndicatorSeries, c: Computed, full: boolean, up: string, down: string) {
  const newest = c.times.at(-1);
  const put = (series: ISeriesApi<"Line" | "Histogram"> | undefined, values: number[] | undefined, tint?: (v: number) => string) => {
    if (!series || !values) return;
    const pts: (Point & { color?: string })[] = toPoints(c.times, values);
    const tinted = (p: Point) => (tint ? { ...p, color: tint(p.value) } : p);
    if (full) return series.setData(pts.map(tinted));
    const p = pts.at(-1);
    if (p && p.time === newest) series.update(tinted(p));
  };
  EMA_KEYS.forEach((k) => put(s[k], c.ema[k]));
  put(s.rsi, c.rsi);
  put(s.macd, c.macd?.hist, (v) => (v >= 0 ? up : down));
  put(s.macdLine, c.macd?.line);
  put(s.macdSignal, c.macd?.signal);
}

export function CandleChart({ feed, interval, onIntervalChange, priceIncrement }: Props) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "light" ? "light" : "dark";
  const palette = palettes[scheme];

  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeries = useRef<IndicatorSeries>({});
  const rsiLines = useRef<IPriceLine[]>([]);
  // the first snapshot of a pair/interval frames the last bars; later refills keep the user's pan/zoom
  const fitted = useRef(false);
  const [on, setOn] = useState<Set<IndicatorKey>>(new Set(["ema20", "ema50"]));
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  // bumps when the chart object exists, so data effects run after creation
  const [ready, setReady] = useState(false);

  // history plus the live candle, for the chips and the OHLC readout
  const merged = useMemo(() => mergeTick(feed.history, feed.tick), [feed.history, feed.tick]);
  const ind = useMemo(() => compute(merged, on), [merged, on]);
  const latest: Partial<Record<IndicatorKey, number | undefined>> = {
    ema20: ind.ema.ema20?.at(-1),
    ema50: ind.ema.ema50?.at(-1),
    ema200: ind.ema.ema200?.at(-1),
    rsi: ind.rsi?.at(-1),
    macd: ind.macd?.line.at(-1),
  };
  // following the hovered time, not a copy, keeps the legend current when that candle is the live one
  const hovered = hoverTime === null ? -1 : merged.findLastIndex((c) => c.time === hoverTime);
  const shownAt = hovered === -1 ? merged.length - 1 : hovered;
  const shown = merged[shownAt];
  const upColor = palette.success.main;
  const downColor = palette.error.main;

  // effect events read the latest render's data without making the effects that call them re-run on it
  const drawCandles = useEffectEvent((full: boolean) => {
    if (full) return candleSeries.current?.setData(merged.map(toBar));
    const last = merged.at(-1);
    if (last) candleSeries.current?.update(toBar(last));
  });
  const drawIndicators = useEffectEvent((full: boolean) =>
    paint(indicatorSeries.current, ind, full, upColor, downColor),
  );

  // create the chart once
  useEffect(() => {
    if (!host.current) return;
    const c = createChart(host.current, {
      autoSize: true,
      // credited in the card footer instead, as the library's NOTICE asks
      layout: { attributionLogo: false },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { timeFormatter: (t: Time) => localTime(t, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
        tickMarkFormatter: (t: Time, type: TickMarkType, locale: string) => localTime(t, TICK_FORMAT[type], locale),
      },
      rightPriceScale: { borderVisible: false },
    });
    chart.current = c;
    fitted.current = false;
    const cs = c.addSeries(CandlestickSeries, {});
    candleSeries.current = cs;
    c.subscribeCrosshairMove((param) => setHoverTime(param.seriesData.has(cs) ? (param.time as number) : null));
    setReady(true);
    return () => {
      c.remove();
      chart.current = null;
      candleSeries.current = null;
      indicatorSeries.current = {};
      rsiLines.current = [];
      setReady(false);
    };
  }, []);

  // theme and price format
  useEffect(() => {
    if (!ready) return;
    const text = palette.text.secondary;
    chart.current?.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: palette.background.paper },
        textColor: text,
        fontFamily: "var(--font-ui), system-ui, sans-serif",
        panes: { separatorColor: palette.divider, separatorHoverColor: palette.divider },
      },
      grid: { vertLines: { color: palette.divider }, horzLines: { color: palette.divider } },
      crosshair: {
        vertLine: { color: text, labelBackgroundColor: palette.primary.main },
        horzLine: { color: text, labelBackgroundColor: palette.primary.main },
      },
    });
    candleSeries.current?.applyOptions({
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
      priceFormat: { type: "price", precision: decimalsOf(priceIncrement), minMove: Number(priceIncrement) || 10 ** -decimalsOf(priceIncrement) },
    });
  }, [ready, palette, upColor, downColor, priceIncrement]);

  // add and remove indicator series as they are toggled, and recolor them on a theme change
  useEffect(() => {
    const c = chart.current;
    if (!ready || !c) return;
    const s = indicatorSeries.current;
    const colors = LINE[scheme];
    const lineOpts = (color: string) => ({ color, lineWidth: 2 as const, priceLineVisible: false, lastValueVisible: false });
    const keep = (name: string, series: ISeriesApi<"Line" | "Histogram">) => {
      s[name] = series;
      return series;
    };
    INDICATORS.forEach(({ key }) => {
      const names = SERIES[key];
      if (!on.has(key)) {
        names.forEach((n) => {
          const old = s[n];
          if (old) c.removeSeries(old);
          delete s[n];
        });
        if (key === "rsi") rsiLines.current = [];
        return;
      }
      if (s[names[0]]) return;
      // a new sub-pane goes after the existing ones, so panes the user already resized keep their size
      const pane = c.panes().length;
      if (key === "rsi") {
        const line = keep("rsi", c.addSeries(LineSeries, { ...lineOpts(colors.rsi), autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) }, pane));
        const level = (price: number) => line.createPriceLine({ price, color: palette.divider, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
        rsiLines.current = [level(70), level(30)];
      } else if (key === "macd") {
        keep("macd", c.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane));
        keep("macdLine", c.addSeries(LineSeries, lineOpts(colors.macd), pane));
        keep("macdSignal", c.addSeries(LineSeries, lineOpts(colors.signal), pane));
      } else {
        keep(key, c.addSeries(LineSeries, lineOpts(colors[key]), 0));
      }
    });
    const tint = { ema20: colors.ema20, ema50: colors.ema50, ema200: colors.ema200, rsi: colors.rsi, macdLine: colors.macd, macdSignal: colors.signal };
    Object.entries(tint).forEach(([name, color]) => s[name]?.applyOptions({ color }));
    rsiLines.current.forEach((l, i) => l.applyOptions({ color: i === 0 ? downColor : upColor }));
    drawIndicators(true);
  }, [ready, on, scheme, palette, upColor, downColor]);

  // history snapshot
  useEffect(() => {
    if (!ready) return;
    drawCandles(true);
    drawIndicators(true);
    const n = feed.history.length;
    if (n === 0) {
      // pair or interval switched: the next snapshot is a new view to frame
      // (a hover time left over from the old data finds no candle in `merged` and falls back to the newest)
      fitted.current = false;
    } else if (!fitted.current) {
      fitted.current = true;
      chart.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 120), to: n + 6 });
    }
  }, [ready, feed.history]);

  // live candle; a snapshot already holds the tick it arrived with
  useEffect(() => {
    if (!ready || !feed.tick || feed.tick === feed.history.at(-1)) return;
    drawCandles(false);
    drawIndicators(false);
  }, [ready, feed.tick, feed.history]);

  const subPanes = Number(on.has("rsi")) + Number(on.has("macd"));
  const dp = decimalsOf(priceIncrement);
  // change against the previous candle's close, so an opening gap counts
  const base = toNumber(merged[shownAt - 1]?.close ?? shown?.open);
  const cl = shown ? toNumber(shown.close) : NaN;
  const chg = base > 0 ? ((cl - base) / base) * 100 : NaN;
  const legend = (k: string, v: string, color?: string) => (
    <Box component="span" sx={{ mr: 1.5 }}>
      <Box component="span" sx={{ color: "text.secondary" }}>{k} </Box>
      <Box component="span" sx={{ color: color ?? "text.primary", fontWeight: 600 }}>{v}</Box>
    </Box>
  );
  // an unknown change (NaN) stays neutral instead of reading as a drop
  const chgColor = chg > 0 ? "var(--mui-palette-success-main)" : chg < 0 ? "var(--mui-palette-error-main)" : undefined;

  return (
    <Paper sx={{ minWidth: 0, overflow: "hidden" }}>
      <Stack direction="row" sx={{ px: 1.5, py: 1, flexWrap: "wrap", rowGap: 1, columnGap: 1.5, alignItems: "center", borderBottom: "1px solid var(--mui-palette-divider)" }}>
        <ToggleButtonGroup exclusive size="small" value={interval} onChange={(_, v: CandleInterval | null) => v && onIntervalChange(v)} aria-label="Timeframe">
          {INTERVALS.map((i) => (
            <ToggleButton key={i} value={i} sx={{ px: 1.5, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
              {i}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" sx={{ flexWrap: "wrap", rowGap: 0.75, columnGap: 0.75 }} role="group" aria-label="Indicators">
          {INDICATORS.map(({ key, label }) => {
            const v = latest[key];
            const active = on.has(key);
            return (
              <Chip
                key={key}
                size="small"
                clickable
                variant={active ? "filled" : "outlined"}
                aria-pressed={active}
                label={`${label}${active && v !== undefined && Number.isFinite(v) ? `: ${fmt(v, key === "rsi" ? 1 : dp)}` : ""}`}
                onClick={() =>
                  setOn((prev) => {
                    const next = new Set(prev);
                    if (!next.delete(key)) next.add(key);
                    return next;
                  })
                }
                sx={{
                  bgcolor: active ? "rgb(from var(--mui-palette-primary-main) r g b / 0.1)" : "transparent",
                  color: active ? "primary.main" : "text.secondary",
                  border: "1px solid",
                  borderColor: active ? "rgb(from var(--mui-palette-primary-main) r g b / 0.3)" : "divider",
                  "&:hover": { bgcolor: "surface" },
                }}
              />
            );
          })}
        </Stack>
      </Stack>
      <Box sx={{ position: "relative", height: { xs: 340 + subPanes * 110, md: 480 + subPanes * 80 } }}>
        <Box ref={host} sx={{ position: "absolute", inset: 0, visibility: colorScheme ? "visible" : "hidden" }} />
        {shown && (
          <Box sx={{ position: "absolute", top: 8, left: 10, zIndex: 2, px: 1, py: 0.5, borderRadius: "4px", bgcolor: "rgb(from var(--mui-palette-background-paper) r g b / 0.9)", border: "1px solid var(--mui-palette-divider)", fontFamily: "var(--font-mono)", fontSize: "0.6875rem", pointerEvents: "none", maxWidth: "calc(100% - 20px)" }}>
            {legend("O", fmt(shown.open, dp))}
            {legend("H", fmt(shown.high, dp), "var(--mui-palette-success-main)")}
            {legend("L", fmt(shown.low, dp), "var(--mui-palette-error-main)")}
            {legend("C", fmt(shown.close, dp))}
            {legend("Chg", fmtPct(chg), chgColor)}
          </Box>
        )}
        {merged.length === 0 && (
          <Box sx={{ position: "absolute", inset: 0, bgcolor: "background.paper", p: 2, zIndex: 3 }}>
            {feed.error ? (
              <Typography color="error.main" role="alert">
                {feed.error}
              </Typography>
            ) : feed.loading ? (
              <Skeleton variant="rounded" width="100%" height="100%" />
            ) : (
              <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", gap: 1, textAlign: "center", px: 2 }}>
                <CandlestickChartOutlined sx={{ fontSize: 32, color: "muted" }} />
                <Typography variant="subtitle1">No price history yet</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: "36ch" }}>
                  The chart fills in as soon as this market publishes its first quote.
                </Typography>
              </Stack>
            )}
          </Box>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1.5, py: 0.75 }}>
        Charts by{" "}
        <Link href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" color="inherit">
          TradingView
        </Link>
      </Typography>
    </Paper>
  );
}
