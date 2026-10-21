"use client";

import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import Search from "@mui/icons-material/Search";
import Star from "@mui/icons-material/Star";
import StarBorder from "@mui/icons-material/StarBorder";
import SwapHorizOutlined from "@mui/icons-material/SwapHorizOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import Tooltip from "@mui/material/Tooltip";
import ToggleButton from "@mui/material/ToggleButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { Panel } from "@/components/common/Panel";
import { useState } from "react";
import { Delta } from "@/components/common/Delta";
import { EmptyState } from "@/components/common/EmptyState";
import { Sparkline } from "@/components/common/Sparkline";
import { useMarketSnapshots, type MarketSnapshot } from "@/hooks/trading/useMarketSnapshots";
import { useMarkets } from "@/hooks/trading/useMarkets";
import { decimalsOf, fmt, fmtTime } from "@/lib/format";
import { stats24h } from "@/lib/stats";

type SortKey = "pair" | "price" | "change";

interface Row extends MarketSnapshot {
  price: number;
  change: number;
  high: number;
  low: number;
}

function toRow(s: MarketSnapshot): Row {
  const price = Number(s.quote?.price ?? s.hourly.at(-1)?.close ?? NaN);
  const st = stats24h(s.hourly, Number.isFinite(price) ? price : undefined);
  return { ...s, price, change: st?.change ?? NaN, high: st?.high ?? NaN, low: st?.low ?? NaN };
}

export function MarketsPage() {
  const markets = useMarkets();
  const snaps = useMarketSnapshots(markets.data);
  const favorites = useFavorites();
  const urlQuery = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  // the header search changes ?q= without remounting this page
  const [seenQuery, setSeenQuery] = useState(urlQuery);
  if (urlQuery !== seenQuery) {
    setSeenQuery(urlQuery);
    setQuery(urlQuery);
  }
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "change", dir: "desc" });

  if (markets.error && !markets.data) {
    return (
      <Alert severity="error" action={<Button onClick={markets.reload}>Retry</Button>}>
        {markets.error}
      </Alert>
    );
  }

  const rows = (snaps.data ?? []).map(toRow);
  const ranked = rows.filter((r) => Number.isFinite(r.change)).sort((a, b) => b.change - a.change);
  const top = ranked[0];
  const weak = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const newest = rows
    .map((r) => r.quote?.timestamp)
    .filter((t): t is string => !!t)
    .sort()
    .at(-1);

  const shown = rows
    .filter((r) => r.market.pair.toLowerCase().includes(query.trim().toLowerCase()) && (!onlyFav || favorites.includes(r.market.pair)))
    .sort((a, b) => {
      const d = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "pair") return a.market.pair.localeCompare(b.market.pair) * d;
      const av = a[sort.key];
      const bv = b[sort.key];
      const x = Number.isFinite(av) ? av : -Infinity;
      const y = Number.isFinite(bv) ? bv : -Infinity;
      return x === y ? a.market.pair.localeCompare(b.market.pair) : x < y ? -d : d;
    });

  const sortBy = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const label = (key: SortKey, text: string) => (
    <TableSortLabel active={sort.key === key} direction={sort.key === key ? sort.dir : "desc"} onClick={() => sortBy(key)}>
      {text}
    </TableSortLabel>
  );

  const exportCsv = () => {
    const lines = ["pair,last_price,change_24h_pct,high_24h,low_24h", ...shown.map((r) => [r.market.pair, r.price, r.change.toFixed(2), r.high, r.low].join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "markets.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack sx={{ gap: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, pt: 0.5 }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>
            Markets &amp; Asset Discovery
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Change, high and low come from the last 24 hourly candles.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={exportCsv} disabled={shown.length === 0} sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          Export CSV
        </Button>
      </Stack>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        <Stat label="Open markets" value={snaps.data ? String(rows.filter((r) => r.market.status === "ACTIVE").length) : "–"} />
        <Stat label="24h top performer" value={top ? top.market.pair : "–"} extra={top && <Delta value={top.change} />} />
        <Stat label="24h weakest" value={weak ? weak.market.pair : "–"} extra={weak && <Delta value={weak.change} />} />
        <Stat label="Newest quote" value={newest ? fmtTime(newest) : "–"} />
      </Box>

      <Paper sx={{ p: 1.5 }}>
        <Stack direction="row" sx={{ gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <OutlinedInput
            size="small"
            placeholder="Search coin or pair"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            startAdornment={<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>}
            inputProps={{ "aria-label": "Search pair" }}
            sx={{ flex: "1 1 260px", maxWidth: 420, fontFamily: "var(--font-ui)", "& input": { fontFamily: "var(--font-ui)" } }}
          />
          <ToggleButton
            value="fav"
            size="small"
            selected={onlyFav}
            onChange={() => setOnlyFav((v) => !v)}
            sx={{ gap: 0.5, border: "1px solid var(--mui-palette-divider)", px: 1.5, minHeight: 36, textTransform: "none" }}
          >
            <Star fontSize="small" /> Favorites ({favorites.length})
          </ToggleButton>
        </Stack>
      </Paper>

      <Panel title={`Showing ${shown.length} of ${rows.length} pairs`} flush>
        {snaps.error && !snaps.data ? (
          <EmptyState title="Could not load prices" hint={snaps.error} action={<Button onClick={snaps.reload}>Retry</Button>} />
        ) : !snaps.data ? (
          <Box sx={{ p: 2 }}>
            <Skeleton height={44} />
            <Skeleton height={44} />
          </Box>
        ) : shown.length === 0 ? (
          <EmptyState
            title={onlyFav && !query ? "No favorites yet" : query ? `No pair matches "${query}"` : "No markets listed"}
            hint={onlyFav && !query ? "Star a pair to pin it here." : query ? "Check the spelling, or clear the search." : undefined}
            action={query || onlyFav ? <Button onClick={() => { setQuery(""); setOnlyFav(false); }}>Clear filters</Button> : undefined}
          />
        ) : (
          <TableContainer>
            <Table aria-label="Markets">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>{label("pair", "Coin / pair")}</TableCell>
                  <TableCell align="right">{label("price", "Last price")}</TableCell>
                  <TableCell align="right">{label("change", "24h change")}</TableCell>
                  <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>24h price action</TableCell>
                  <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>24h high / low</TableCell>
                  <TableCell align="right">Quick execute</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((r) => {
                  const dp = decimalsOf(r.market.priceIncrement);
                  const fav = favorites.includes(r.market.pair);
                  const active = r.market.status === "ACTIVE";
                  return (
                    <TableRow key={r.market.pair} hover>
                      <TableCell padding="checkbox">
                        <Tooltip title={fav ? "Remove from favorites" : "Add to favorites"}>
                          <IconButton aria-label={`${fav ? "Remove" : "Add"} ${r.market.pair} ${fav ? "from" : "to"} favorites`} aria-pressed={fav} onClick={() => toggleFavorite(r.market.pair)} sx={{ width: 44, height: 44, color: fav ? "primary.main" : "muted" }}>
                            {fav ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ alignItems: "center", gap: 1.25 }}>
                          <Box aria-hidden sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "surface", border: "1px solid var(--mui-palette-divider)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.8125rem", color: "primary.main" }}>
                            {r.market.base.charAt(0)}
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                              {r.market.base} <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>/ {r.market.quote}</Box>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Spot{active ? "" : ` · ${r.market.status.toLowerCase()}`}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.8125rem !important" }}>
                        {Number.isFinite(r.price) ? fmt(r.price, dp) : <Box component="span" sx={{ fontFamily: "var(--font-ui)", fontWeight: 500, color: "text.secondary" }}>No quote yet</Box>}
                      </TableCell>
                      <TableCell align="right"><Delta value={r.change} /></TableCell>
                      <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        <Sparkline candles={r.hourly} />
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" }, color: "text.secondary" }}>
                        H {fmt(r.high, dp)}<br />L {fmt(r.low, dp)}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Button component={Link} href={`/trade?pair=${r.market.pair}`} size="small" variant="contained" color="success" disabled={!active} sx={{ mr: 0.75, minHeight: 44, minWidth: 72, fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: "0.75rem" }}>
                          Trade
                        </Button>
                        <Tooltip title="Swap">
                          <IconButton component={Link} href="/swap" aria-label={`Swap ${r.market.base}`} sx={{ width: 44, height: 44, border: "1px solid var(--mui-palette-divider)", borderRadius: "4px", color: "primary.main" }}>
                            <SwapHorizOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>
    </Stack>
  );
}

function Stat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <Paper sx={{ p: 1.5, minHeight: 84 }}>
      <Typography variant="overline">{label}</Typography>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
        <Typography sx={{ fontFamily: "var(--font-mono)", fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.2 }}>{value}</Typography>
        {extra}
      </Stack>
    </Paper>
  );
}
