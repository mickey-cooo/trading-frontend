"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import Stack from "@mui/material/Stack";
import { useApiLatency } from "@/hooks/trading/useApiLatency";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { LoginPrompt } from "@/components/common/LoginPrompt";
import { useToast } from "@/components/common/Toast";
import { usePolling } from "@/hooks/trading/usePolling";
import { useIsAuthed } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/axios/client";
import { fmt, fmtTime, shortId } from "@/lib/format";
import { getLedger } from "@/services/account.service";
import { cancelOrder, getOrders, getTrades } from "@/services/order.service";
import type { Order } from "@/types/trading";

type TabKey = "open" | "history" | "fills" | "ledger";

const sideColor = (s: string) => (s === "BUY" ? "success.main" : "error.main");

export function OrdersDeck({ version, onChanged }: { version: number; onChanged: () => void }) {
  const authed = useIsAuthed();
  const [tab, setTab] = useState<TabKey>("open");
  const [toast, toastNode] = useToast();

  const open = usePolling(() => getOrders("OPEN", 0, 50), 4000, authed, "", version);
  const history = usePolling(() => getOrders(undefined, 0, 50), 6000, authed && tab === "history", "", version);
  const fills = usePolling(() => getTrades(0, 50), 6000, authed && tab === "fills", "", version);
  const ledger = usePolling(() => getLedger(0, 50), 10000, authed && tab === "ledger", "", version);

  const cancel = async (id: string) => {
    try {
      await cancelOrder(id);
      toast("Order cancelled", "success");
      onChanged();
    } catch (e) {
      toast(getErrorMessage(e), "error");
    }
  };

  const active = { open, history, fills, ledger }[tab];
  const openCount = open.data?.page.totalElements ?? 0;
  const latency = useApiLatency();

  const [cancelling, setCancelling] = useState(false);
  const cancelAll = async () => {
    if (cancelling || !window.confirm(`Cancel all ${openCount} open orders?`)) return;
    setCancelling(true);
    try {
      // the list is paged: collect every open order, not only the page on screen
      const ids: string[] = [];
      for (let page = 0, pages = 1; page < pages; page++) {
        const res = await getOrders("OPEN", page, 100);
        ids.push(...res.content.map((o) => o.id));
        pages = res.page.totalPages;
      }
      const results = await Promise.allSettled(ids.map((id) => cancelOrder(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      toast(failed ? `${failed} of ${ids.length} orders could not be cancelled` : `Cancelled ${ids.length} orders`, failed ? "error" : "success");
    } catch (e) {
      toast(getErrorMessage(e), "error");
    } finally {
      setCancelling(false);
      onChanged();
    }
  };

  return (
    <Paper>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 1, borderBottom: "1px solid var(--mui-palette-divider)", gap: 1, flexWrap: "wrap" }}>
        <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} variant="scrollable" scrollButtons={false} aria-label="Orders and activity">
          <Tab value="open" label={`Open orders${authed && openCount ? ` (${openCount})` : ""}`} />
          <Tab value="history" label="Order history" />
          <Tab value="fills" label="Trade history" />
          <Tab value="ledger" label="Audit log" />
        </Tabs>
        <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
          {authed && openCount > 0 && (
            <Button size="small" color="error" disabled={cancelling} onClick={cancelAll} sx={{ minHeight: 32, fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: "0.6875rem" }}>
              Cancel all orders
            </Button>
          )}
          <Typography variant="caption" sx={{ fontFamily: "var(--font-mono)", color: "text.secondary" }}>
            API latency: <Box component="span" sx={{ color: "success.main", fontWeight: 600 }}>{latency === undefined ? "–" : `${latency} ms`}</Box>
          </Typography>
        </Stack>
      </Stack>
      <Box sx={{ minHeight: 180 }}>
        {!authed ? (
          <LoginPrompt title="Your orders live here" hint="Log in to place orders and follow every fill and ledger entry." />
        ) : active.loading && !active.data ? (
          <Box sx={{ p: 2 }}>
            <Skeleton height={32} />
            <Skeleton height={32} />
            <Skeleton height={32} />
          </Box>
        ) : active.error && !active.data ? (
          <EmptyState title="Could not load this list" hint={active.error} action={<Button onClick={active.reload}>Retry</Button>} />
        ) : tab === "open" || tab === "history" ? (
          <OrdersTable orders={(tab === "open" ? open : history).data?.content ?? []} onCancel={cancel} empty={tab === "open" ? "No open orders" : "No orders yet"} />
        ) : tab === "fills" ? (
          <Fills rows={fills.data?.content ?? []} />
        ) : (
          <LedgerTable rows={ledger.data?.content ?? []} />
        )}
      </Box>
      {toastNode}
    </Paper>
  );
}

function OrdersTable({ orders, onCancel, empty }: { orders: Order[]; onCancel: (id: string) => void; empty: string }) {
  if (orders.length === 0) return <EmptyState title={empty} hint="Orders you place from the form appear here." />;
  return (
    <TableContainer>
      <Table size="small" aria-label="Orders">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Pair</TableCell>
            <TableCell>Side</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell>Status</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id} hover>
              <TableCell>{fmtTime(o.createdAt)}</TableCell>
              <TableCell>{o.symbol}</TableCell>
              <TableCell sx={{ color: sideColor(o.side), fontWeight: 600 }}>{o.side === "BUY" ? "Buy" : "Sell"}</TableCell>
              <TableCell>{o.type === "LIMIT" ? "Limit" : "Market"}</TableCell>
              <TableCell align="right">{o.quantity}</TableCell>
              <TableCell align="right">{o.limitPrice ?? "Market"}</TableCell>
              <TableCell>
                <Chip size="small" variant="outlined" label={o.status === "OPEN" ? "Open" : o.status === "FILLED" ? "Filled" : "Cancelled"} color={o.status === "FILLED" ? "success" : "default"} />
              </TableCell>
              <TableCell align="right">
                {o.status === "OPEN" && (
                  <Button size="small" color="error" onClick={() => onCancel(o.id)} sx={{ minHeight: 32 }}>
                    Cancel
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function Fills({ rows }: { rows: { orderId: string; price: string; quantity: string; quoteVersion: number; timestamp: string }[] }) {
  if (rows.length === 0) return <EmptyState title="No fills yet" hint="A fill appears when a market order executes or a limit order is reached." />;
  return (
    <TableContainer>
      <Table size="small" aria-label="Fills">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Order</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Quote #</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.orderId}-${i}`} hover>
              <TableCell>{fmtTime(r.timestamp)}</TableCell>
              <TableCell sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{shortId(r.orderId)}</TableCell>
              <TableCell align="right">{fmt(r.price, 2)}</TableCell>
              <TableCell align="right">{r.quantity}</TableCell>
              <TableCell align="right">{r.quoteVersion}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function LedgerTable({ rows }: { rows: { asset: string; bucket: string; amount: string; type: string; reference: string; timestamp: string }[] }) {
  if (rows.length === 0) return <EmptyState title="No ledger entries" hint="Funding, reservations and trades are recorded here." />;
  return (
    <TableContainer>
      <Table size="small" aria-label="Audit log">
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Asset</TableCell>
            <TableCell>Bucket</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Reference</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => {
            const n = Number(r.amount);
            return (
              <TableRow key={`${r.reference}-${r.bucket}-${i}`} hover>
                <TableCell>{fmtTime(r.timestamp)}</TableCell>
                <TableCell>{r.type.charAt(0) + r.type.slice(1).toLowerCase()}</TableCell>
                <TableCell>{r.asset}</TableCell>
                <TableCell>{r.bucket === "AVAILABLE" ? "Available" : "In orders"}</TableCell>
                <TableCell align="right" sx={{ color: n >= 0 ? "success.main" : "error.main", fontWeight: 600 }}>
                  {n > 0 ? "+" : ""}
                  {r.amount}
                </TableCell>
                <TableCell>
                  <Typography component="span" sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "text.secondary" }}>
                    {r.reference.length > 24 ? `${r.reference.slice(0, 24)}…` : r.reference}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
