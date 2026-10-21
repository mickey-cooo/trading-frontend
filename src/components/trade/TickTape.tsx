"use client";

import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { keyframes } from "@mui/material/styles";
import { Panel } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/EmptyState";
import type { Print } from "@/hooks/trading/useCandleFeed";
import { decimalsOf, fmt } from "@/lib/format";
import type { Market } from "@/types/trading";

// 15% tint for 250 ms on a fresh print (DESIGN.md, Execution Ticker)
const flash = keyframes`from { opacity: 1; } to { opacity: 0; }`;

// The API has no order book. This is the stream's own prints: every price move, newest first.
export function TickTape({ market, rows }: { market: Market; rows: Print[] }) {
  const dp = decimalsOf(market.priceIncrement);

  return (
    <Panel title="Live ticks" flush sx={{ height: "100%" }}>
      {rows.length === 0 ? (
        <EmptyState title="Waiting for the first quote" hint="Prints appear as the price moves." />
      ) : (
        <Box sx={{ maxHeight: { lg: 560 }, overflow: "auto" }}>
          <Table size="small" stickyHeader aria-label="Live price prints">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell align="right">Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.id} sx={{ position: "relative" }}>
                  <TableCell sx={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "text.secondary", py: 0.5 }}>
                    {new Date(r.at).toLocaleTimeString("en-GB", { hour12: false })}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, fontWeight: 600, color: r.dir === 1 ? "success.main" : "error.main", position: "relative" }}>
                    {i === 0 && (
                      <Box
                        aria-hidden
                        sx={{ position: "absolute", inset: 0, bgcolor: r.dir === 1 ? "success.main" : "error.main", opacity: 0.15, animation: `${flash} 250ms ease-out forwards` }}
                      />
                    )}
                    <span style={{ position: "relative" }}>{fmt(r.price, dp)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Panel>
  );
}
