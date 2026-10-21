"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { Panel } from "@/components/common/Panel";
import { LabeledInput } from "@/components/common/LabeledInput";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRef, useState } from "react";
import { useToast } from "@/components/common/Toast";
import { getErrorMessage } from "@/lib/axios/client";
import { newIdempotencyKey } from "@/lib/uuid";
import { useIsAuthed } from "@/lib/auth/session";
import { decimalsOf, floorTo, fmt, toNumber } from "@/lib/format";
import { submitOrder } from "@/services/order.service";
import type { Balance, Market, OrderSide, OrderType, SubmitOrderRequest } from "@/types/trading";

const PCTS = [25, 50, 75, 100];
const USD_PRESETS = [100, 500, 1000, 5000];
// a market buy sized to 100% would fail if the price ticks up before it fills
const MARKET_BUY_BUFFER = 0.998;

interface Props {
  market: Market;
  lastPrice: number | undefined;
  balances: Balance[] | undefined;
  onPlaced: () => void;
}

export function OrderForm({ market, lastPrice, balances, onPlaced }: Props) {
  const authed = useIsAuthed();
  const [toast, toastNode] = useToast();
  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("LIMIT");
  const [priceInput, setPriceInput] = useState<string>();
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // kept across an ambiguous network failure so the retry replays instead of duplicating
  const pending = useRef<{ key: string; body: string }>(null);

  const priceDp = decimalsOf(market.priceIncrement);
  const qtyDp = decimalsOf(market.quantityIncrement);
  const buy = side === "BUY";
  const color = buy ? "success" : "error";

  const limitPrice = priceInput ?? (lastPrice !== undefined ? lastPrice.toFixed(priceDp) : "");
  const execPrice = type === "LIMIT" ? toNumber(limitPrice) : (lastPrice ?? NaN);
  const quantity = toNumber(qty);
  const total = quantity * execPrice;

  const bal = (asset: string) => toNumber(balances?.find((b) => b.asset === asset)?.available ?? 0);
  const available = buy ? bal(market.quote) : bal(market.base);
  const spend = buy ? total : quantity;

  let problem: string | undefined;
  if (qty && !(quantity >= Number(market.quantityIncrement))) problem = `Minimum size is ${market.quantityIncrement} ${market.base}`;
  else if (type === "LIMIT" && limitPrice && !(execPrice > 0)) problem = "Enter a limit price";
  else if (authed && balances && spend > available + 1e-12)
    problem = `Needs ${fmt(spend, buy ? 2 : qtyDp)} ${buy ? market.quote : market.base}, you have ${fmt(available, buy ? 2 : qtyDp)}`;

  const ready = quantity > 0 && execPrice > 0 && !problem;

  const setQtyFromQuote = (quoteAmount: number) => {
    if (execPrice > 0) setQty(floorTo(quoteAmount / execPrice, market.quantityIncrement));
  };
  const pctChip = (pct: number) => {
    const f = pct / 100;
    if (buy) setQtyFromQuote(available * f * (type === "MARKET" ? MARKET_BUY_BUFFER : 1));
    else setQty(floorTo(available * f, market.quantityIncrement));
  };

  const place = async () => {
    const request: SubmitOrderRequest = {
      symbol: market.pair,
      side,
      type,
      quantity: floorTo(quantity, market.quantityIncrement),
      ...(type === "LIMIT" ? { limitPrice: floorTo(Number(limitPrice), market.priceIncrement) } : {}),
    };
    // stop the untouched price following the live tick, so a retry sends the identical body
    if (type === "LIMIT") setPriceInput(request.limitPrice);
    const body = JSON.stringify(request);
    if (pending.current?.body !== body) pending.current = { key: newIdempotencyKey(), body };
    setBusy(true);
    setError(undefined);
    try {
      const order = await submitOrder(request, pending.current.key);
      pending.current = null;
      toast(
        order.status === "FILLED"
          ? `${buy ? "Bought" : "Sold"} ${order.quantity} ${market.base}`
          : `Limit ${side.toLowerCase()} for ${order.quantity} ${market.base} is open`,
        "success",
      );
      setQty("");
      onPlaced();
    } catch (e) {
      // an HTTP answer is final; only a missing answer keeps the key for a safe retry
      const answered = (e as { response?: unknown }).response !== undefined;
      if (answered) pending.current = null;
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const side_ = (s: OrderSide) => (
    <Button
      fullWidth
      variant={side === s ? "contained" : "outlined"}
      color={s === "BUY" ? "success" : "error"}
      onClick={() => {
        setSide(s);
        setQty("");
        setError(undefined);
      }}
      aria-pressed={side === s}
      sx={{ minHeight: 44, fontSize: "1rem", fontWeight: 700, ...(side !== s && { color: "text.secondary", bgcolor: "surface" }) }}
    >
      {s === "BUY" ? "Buy" : "Sell"}
    </Button>
  );

  return (
    <Panel
      title="Order ticket"
      actions={
        <ToggleButtonGroup exclusive size="small" value="pro" aria-label="Ticket mode">
          <ToggleButton value="pro" sx={{ px: 1, fontSize: "0.6875rem" }}>
            Pro
          </ToggleButton>
          <ToggleButton component={Link} href="/swap" value="swap" sx={{ px: 1, fontSize: "0.6875rem" }}>
            Simple swap
          </ToggleButton>
        </ToggleButtonGroup>
      }
    >
      <Stack sx={{ gap: 1.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}>
          {side_("BUY")}
          {side_("SELL")}
        </Box>

        <ToggleButtonGroup exclusive fullWidth size="small" value={type} onChange={(_, v: OrderType | null) => v && setType(v)} aria-label="Order type">
          <ToggleButton value="LIMIT">Limit</ToggleButton>
          <ToggleButton value="MARKET">Market</ToggleButton>
        </ToggleButtonGroup>

        <LabeledInput
          label="Order price"
          note={
            type === "LIMIT" && lastPrice !== undefined ? (
              <Button size="small" onClick={() => setPriceInput(undefined)} sx={{ minHeight: 24, p: 0, minWidth: 0, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", textTransform: "uppercase" }}>
                Use last
              </Button>
            ) : undefined
          }
          value={type === "MARKET" ? "Market price" : limitPrice}
          disabled={type === "MARKET"}
          onChange={(v) => setPriceInput(v.replace(/[^0-9.]/g, ""))}
          affix={market.quote}
        />

        <LabeledInput
          label="Quantity"
          note={authed ? `Avail: ${fmt(available, buy ? 2 : qtyDp)} ${buy ? market.quote : market.base}` : undefined}
          value={qty}
          placeholder="0.00"
          onChange={(v) => setQty(v.replace(/[^0-9.]/g, ""))}
          affix={market.base}
          error={!!problem}
          helper={problem ?? (type === "MARKET" && buy ? "Max leaves 0.2% for price moves" : " ")}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.75 }} role="group" aria-label="Size as percent of balance">
          {PCTS.map((p) => (
            <Button key={p} variant="outlined" size="small" onClick={() => pctChip(p)} disabled={!authed || !balances} sx={{ minHeight: 32, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
              {p}%
            </Button>
          ))}
        </Box>
        <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }} role="group" aria-label="Size in dollars">
          <Typography variant="overline" sx={{ mr: 0.5 }}>
            Quick
          </Typography>
          {USD_PRESETS.map((u) => (
            <Button key={u} variant="outlined" size="small" onClick={() => setQtyFromQuote(u)} sx={{ minHeight: 32, flex: 1, minWidth: 0, fontFamily: "var(--font-mono)", fontSize: "0.75rem", px: 0.5 }}>
              {u >= 1000 ? `$${u / 1000}k` : `$${u}`}
            </Button>
          ))}
        </Stack>

        <Box sx={{ p: 1.25, bgcolor: "surface", border: "1px solid var(--mui-palette-divider)", borderRadius: "4px", display: "grid", gap: 0.5 }}>
          <Row label={type === "MARKET" ? "Est. order value" : "Order value"} value={total > 0 ? `${fmt(total, 2)} ${market.quote}` : "–"} />
          <Row label="Fee" value="None" />
        </Box>

        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}

        {authed ? (
          <Button
            variant="contained"
            color={color}
            size="large"
            fullWidth
            disabled={!ready || busy}
            onClick={place}
            sx={{ minHeight: 52, justifyContent: "space-between", px: 2, fontFamily: "var(--font-mono)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.02em" }}
          >
            <span>{busy ? "Placing order…" : `${buy ? "Buy" : "Sell"} ${market.base}`}</span>
            {!busy && quantity > 0 && <span style={{ fontWeight: 500, opacity: 0.9 }}>({fmt(quantity, qtyDp)} {market.base})</span>}
          </Button>
        ) : (
          <Button component={Link} href={`/login?next=${encodeURIComponent(`/trade?pair=${market.pair}`)}`} variant="contained" size="large" fullWidth sx={{ minHeight: 52 }}>
            Log in to trade
          </Button>
        )}
      </Stack>
      {toastNode}
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}
