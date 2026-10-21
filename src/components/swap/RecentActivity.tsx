"use client";

import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { EmptyState } from "@/components/common/EmptyState";
import { LoginPrompt } from "@/components/common/LoginPrompt";
import { Panel } from "@/components/common/Panel";
import { usePolling } from "@/hooks/trading/usePolling";
import { useIsAuthed } from "@/lib/auth/session";
import { fmt, fmtTime, shortId } from "@/lib/format";
import { getTrades } from "@/services/order.service";

export function RecentActivity({ version }: { version: number }) {
  const authed = useIsAuthed();
  const fills = usePolling(() => getTrades(0, 10), 8000, authed, "", version);
  const rows = fills.data?.content ?? [];
  return (
    <Panel
      title="Recent conversions"
      flush
      actions={
        authed ? (
          <Button size="small" onClick={fills.reload} sx={{ minHeight: 28, fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: "0.6875rem" }}>
            Refresh
          </Button>
        ) : undefined
      }
    >
      {!authed ? (
        <LoginPrompt title="Your swaps show up here" hint="Log in to swap and see each fill as it lands." />
      ) : rows.length === 0 ? (
        <EmptyState title="No fills yet" hint="Your first swap appears here within a second of confirming." />
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Recent fills">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Order</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.orderId}-${i}`} hover>
                  <TableCell sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{fmtTime(r.timestamp)}</TableCell>
                  <TableCell sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "text.secondary" }}>{shortId(r.orderId)}</TableCell>
                  <TableCell align="right">{fmt(r.price, 2)}</TableCell>
                  <TableCell align="right">{r.quantity}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" label="Filled" sx={{ bgcolor: "rgb(from var(--mui-palette-success-main) r g b / 0.1)", color: "success.main", border: "1px solid rgb(from var(--mui-palette-success-main) r g b / 0.2)", height: 22 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Panel>
  );
}
