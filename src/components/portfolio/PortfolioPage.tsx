"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Panel } from "@/components/common/Panel";
import { PieChart } from "@mui/x-charts/PieChart";
import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { LoginPrompt } from "@/components/common/LoginPrompt";
import { LedgerTable } from "@/components/trade/OrdersDeck";
import { useMarkets } from "@/hooks/trading/useMarkets";
import { usePolling } from "@/hooks/trading/usePolling";
import { useIsAuthed } from "@/lib/auth/session";
import { fmt, fmtTime, fmtUsd, toNumber } from "@/lib/format";
import { getLedger, getPortfolio } from "@/services/account.service";
import { getOrders } from "@/services/order.service";
import { usePalette } from "@/theme/usePalette";

// distinct, non-semantic hues: green and red are reserved for gain and loss
const SLICES = ["#26A69A", "#38BDF8", "#A78BFA", "#FBBF24", "#94A3B8"];

export function PortfolioPage() {
  const authed = useIsAuthed();
  const p = usePalette();
  const markets = useMarkets();
  const portfolio = usePolling(getPortfolio, 5000, authed);
  const open = usePolling(() => getOrders("OPEN", 0, 1), 8000, authed);
  const ledger = usePolling(() => getLedger(0, 10), 15000, authed);

  if (!authed) {
    return (
      <Paper>
        <LoginPrompt title="Your portfolio is private" hint="Log in to see balances, allocation and recent account activity." />
      </Paper>
    );
  }
  if (portfolio.error && !portfolio.data) {
    return (
      <Alert severity="error" action={<Button onClick={portfolio.reload}>Retry</Button>}>
        {portfolio.error}
      </Alert>
    );
  }
  if (!portfolio.data) {
    return (
      <Stack sx={{ gap: 1.5 }}>
        <Skeleton variant="rounded" height={88} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    );
  }

  const assets = portfolio.data.assets.map((a) => {
    const total = toNumber(a.available) + toNumber(a.reserved);
    const value = toNumber(a.valueUsdt);
    return { ...a, total, value, index: total > 0 && Number.isFinite(value) ? value / total : NaN };
  });
  const priced = assets.filter((a) => Number.isFinite(a.value));
  const totalValue = priced.reduce((s, a) => s + a.value, 0);
  const inOrdersValue = priced.reduce((s, a) => s + (a.total > 0 ? a.value * (toNumber(a.reserved) / a.total) : 0), 0);
  const unpriced = assets.length - priced.length;
  const slices = priced.filter((a) => a.value > 0).map((a, i) => ({ id: a.asset, label: a.asset, value: a.value, color: SLICES[i % SLICES.length] }));
  const pairFor = (asset: string) => markets.data?.find((m) => m.base === asset)?.pair;

  return (
    <Stack sx={{ gap: 1.5 }}>
      <Box>
        <Typography variant="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>Portfolio &amp; Risk</Typography>
        <Typography color="text.secondary">
          Valued in USDT at the latest quote{portfolio.data.quoteTime ? `, ${fmtTime(portfolio.data.quoteTime)}` : ""}.
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        <Metric label="Total value" value={fmtUsd(totalValue)} big />
        <Metric label="Available" value={fmtUsd(totalValue - inOrdersValue)} />
        <Metric label="Held in open orders" value={fmtUsd(inOrdersValue)} />
        <Metric label="Open orders" value={open.data ? String(open.data.page.totalElements) : "–"} />
      </Box>
      {unpriced > 0 && <Alert severity="info">{unpriced} asset{unpriced > 1 ? "s have" : " has"} no price yet and {unpriced > 1 ? "are" : "is"} left out of the totals.</Alert>}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,340px) minmax(0,1fr)" }, alignItems: "start" }}>
        <Panel title="Asset allocation">
          {slices.length === 0 ? (
            <EmptyState title="Nothing to chart yet" hint="Allocation appears once you hold a priced asset." />
          ) : (
            <PieChart
              series={[{ data: slices, innerRadius: 62, outerRadius: 96, paddingAngle: 2, cornerRadius: 4, valueFormatter: (v) => fmtUsd(v.value) }]}
              height={240}
              hideLegend={false}
              slotProps={{ legend: { sx: { color: p.text.secondary } } }}
              aria-label="Allocation by asset"
            />
          )}
        </Panel>

        <Panel title="Asset inventory" flush>
          {assets.length === 0 ? (
            <EmptyState title="No balances yet" hint="Your account opens with demo funds on your first order." />
          ) : (
            <TableContainer>
              <Table aria-label="Assets">
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell align="right">Available</TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>In orders</TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>Price</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Share</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assets.map((a) => {
                    const pair = pairFor(a.asset);
                    return (
                      <TableRow key={a.asset} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{a.asset}</TableCell>
                        <TableCell align="right">{a.available}</TableCell>
                        <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>{a.reserved}</TableCell>
                        <TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>{Number.isFinite(a.index) ? fmtUsd(a.index) : "–"}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{Number.isFinite(a.value) ? fmtUsd(a.value) : "No price"}</TableCell>
                        <TableCell align="right">{Number.isFinite(a.value) && totalValue > 0 ? `${fmt((a.value / totalValue) * 100, 1)}%` : "–"}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {pair ? (
                            <>
                              <Button component={Link} href={`/trade?pair=${pair}`} size="small" variant="contained" color="success" sx={{ mr: 1, minHeight: 36, fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: "0.75rem" }}>Trade</Button>
                              <Button component={Link} href="/swap" size="small" variant="outlined" sx={{ minHeight: 36 }}>Swap</Button>
                            </>
                          ) : (
                            <Button component={Link} href="/swap" size="small" variant="outlined" sx={{ minHeight: 36 }}>Swap</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Panel>
      </Box>

      <Panel title="Recent account activity" flush>
        {ledger.data ? <LedgerTable rows={ledger.data.content} /> : <Skeleton height={120} sx={{ mx: 2 }} />}
      </Panel>
    </Stack>
  );
}

function Metric({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <Paper sx={{ p: 1.5, minHeight: 84 }}>
      <Typography variant="overline">{label}</Typography>
      <Typography sx={{ mt: 0.75, fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: big ? "1.5rem" : "1.25rem", lineHeight: 1.2 }}>{value}</Typography>
    </Paper>
  );
}
