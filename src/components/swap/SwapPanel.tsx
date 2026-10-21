"use client";

import SwapVert from "@mui/icons-material/SwapVert";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Bolt from "@mui/icons-material/Bolt";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { LabeledInput } from "@/components/common/LabeledInput";
import { Panel } from "@/components/common/Panel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { useToast } from "@/components/common/Toast";
import { usePolling } from "@/hooks/trading/usePolling";
import { useIsAuthed } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/axios/client";
import { newIdempotencyKey } from "@/lib/uuid";
import { decimalsOf, floorTo, fmt, fmtUsd, toNumber } from "@/lib/format";
import { getBalances } from "@/services/account.service";
import { getQuote } from "@/services/market.service";
import { submitOrder } from "@/services/order.service";
import type { Market } from "@/types/trading";

// WebGL only exists in the browser
const SwapOrb = dynamic(() => import("./SwapOrb").then((m) => m.SwapOrb), { ssr: false, loading: () => <div style={{ height: 88 }} /> });

const MAX_BUFFER = 0.998; // keeps a market buy inside the balance if the price ticks up

export interface SwapPreset {
  pay: string;
  receive: string;
  amount?: string;
  nonce: number;
}

interface Props {
  markets: Market[];
  preset?: SwapPreset;
  onSwapped: () => void;
}

export function SwapPanel({ markets, preset, onSwapped }: Props) {
  const quote = markets[0].quote;
  const bases = markets.map((m) => m.base);
  const assets = [quote, ...bases];

  const authed = useIsAuthed();
  const [toast, toastNode] = useToast();
  const [pay, setPay] = useState(quote);
  const [receive, setReceive] = useState(bases[0]);
  const [amount, setAmount] = useState("");
  const [flips, setFlips] = useState(0);
  const [settles, setSettles] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef<{ key: string; body: string }>(null);

  // a preset from the side panel sets the whole form once per click
  const [seen, setSeen] = useState(0);
  if (preset && preset.nonce !== seen) {
    setSeen(preset.nonce);
    setPay(preset.pay);
    setReceive(preset.receive);
    setAmount(preset.amount ?? "");
    setError(undefined);
  }

  // a market can leave the active list while it is selected (e.g. suspended)
  if (!assets.includes(pay) || !assets.includes(receive)) {
    setPay(quote);
    setReceive(bases[0]);
  }

  const buying = pay === quote;
  const coin = buying ? receive : pay;
  const market = markets.find((m) => m.base === coin) ?? markets[0];

  const price = usePolling(() => getQuote(market.pair), 3000, true, market.pair);
  const balances = usePolling(getBalances, 5000, authed, "", settles);

  const rate = toNumber(price.data?.price);
  const payAmount = toNumber(amount);
  const qtyDp = decimalsOf(market.quantityIncrement);
  const available = toNumber(balances.data?.find((b) => b.asset === pay)?.available ?? 0);

  // what the order will contain: buy sizes in coin, sell is already in coin
  const orderQty = buying ? (rate > 0 ? floorTo(payAmount / rate, market.quantityIncrement) : "0") : floorTo(payAmount, market.quantityIncrement);
  const receiveAmount = buying ? toNumber(orderQty) : toNumber(orderQty) * rate;
  const spent = buying ? toNumber(orderQty) * rate : toNumber(orderQty);

  let problem: string | undefined;
  if (payAmount > 0 && !(rate > 0) && !price.loading) problem = `No quote yet for ${market.base} / ${market.quote}`;
  else if (payAmount > 0 && toNumber(orderQty) < Number(market.quantityIncrement)) problem = `Too small: minimum is ${market.quantityIncrement} ${coin}`;
  else if (authed && balances.data && spent > available + 1e-12) problem = `You have ${fmt(available, pay === quote ? 2 : qtyDp)} ${pay}`;
  const ready = payAmount > 0 && rate > 0 && !problem;

  const pickPay = (a: string) => {
    setPay(a);
    if (a !== quote) setReceive(quote);
    else if (receive === quote) setReceive(bases[0]);
    setAmount("");
  };
  const pickReceive = (a: string) => {
    setReceive(a);
    if (a !== quote) setPay(quote);
    else if (pay === quote) setPay(bases[0]);
    setAmount("");
  };
  const flip = () => {
    setPay(receive);
    setReceive(pay);
    setAmount("");
    setFlips((f) => f + 1);
  };
  const setPct = (pct: number) => {
    const v = available * (pct / 100) * (buying && pct === 100 ? MAX_BUFFER : 1);
    setAmount(buying ? floorTo(v, "0.01") : floorTo(v, market.quantityIncrement));
  };

  const swap = async () => {
    const request = { symbol: market.pair, side: buying ? ("BUY" as const) : ("SELL" as const), type: "MARKET" as const, quantity: orderQty };
    const body = JSON.stringify(request);
    if (pending.current?.body !== body) pending.current = { key: newIdempotencyKey(), body };
    setBusy(true);
    setError(undefined);
    try {
      const order = await submitOrder(request, pending.current.key);
      pending.current = null;
      toast(`Swapped ${buying ? `${fmt(spent, 2)} ${quote} for ${order.quantity} ${coin}` : `${order.quantity} ${coin} for ${quote}`}`, "success");
      setAmount("");
      setSettles((s) => s + 1);
      onSwapped();
    } catch (e) {
      if ((e as { response?: unknown }).response !== undefined) pending.current = null;
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const assetSelect = (value: string, onPick: (a: string) => void, label: string) => (
    <Select
      size="small"
      value={value}
      onChange={(e) => onPick(e.target.value)}
      inputProps={{ "aria-label": label }}
      sx={{ minWidth: 104, fontFamily: "var(--font-ui)", fontWeight: 700, minHeight: 44 }}
    >
      {assets.map((a) => (
        <MenuItem key={a} value={a}>
          {a}
        </MenuItem>
      ))}
    </Select>
  );

  const box = { p: 1.5, bgcolor: "surface", border: "1px solid var(--mui-palette-divider)", borderRadius: "8px" } as const;

  return (
    <Panel title="Spot converter" actions={<Typography variant="overline" sx={{ color: "success.main" }}>No fee</Typography>} sx={{ maxWidth: 560, width: "100%" }}>
      <SwapOrb from={pay} to={receive} flips={flips} settles={settles} />

      <Stack sx={{ gap: 0.5 }}>
        <Box sx={box}>
          <LabeledInput
            label="You pay"
            note={authed ? `Avail: ${fmt(available, pay === quote ? 2 : qtyDp)} ${pay}` : undefined}
            value={amount}
            placeholder="0.00"
            onChange={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
            affix={assetSelect(pay, pickPay, "Asset you pay")}
            error={!!problem}
            helper={problem ?? " "}
            big
          />
          <Stack direction="row" sx={{ gap: 0.75, mt: 0.5 }} role="group" aria-label="Amount presets">
            {[25, 50, 75].map((p) => (
              <Button key={p} variant="outlined" size="small" onClick={() => setPct(p)} disabled={!authed || !balances.data} sx={{ flex: 1, minHeight: 32, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                {p}%
              </Button>
            ))}
            <Button variant="outlined" size="small" onClick={() => setPct(100)} disabled={!authed || !balances.data} sx={{ flex: 1, minHeight: 32, fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "primary.main" }}>
              Max
            </Button>
          </Stack>
        </Box>

        <Stack sx={{ alignItems: "center", my: -2.25, zIndex: 1, position: "relative" }}>
          <IconButton aria-label="Reverse swap direction" onClick={flip} sx={{ width: 40, height: 40, bgcolor: "background.paper", border: "1px solid var(--mui-palette-outline)", "&:hover": { bgcolor: "surface" } }}>
            <SwapVert />
          </IconButton>
        </Stack>

        <Box sx={box}>
          <LabeledInput
            label="You receive (estimate)"
            note={rate > 0 && receiveAmount > 0 ? `≈ ${fmtUsd(buying ? toNumber(orderQty) * rate : receiveAmount)}` : undefined}
            value={receiveAmount > 0 ? fmt(receiveAmount, buying ? qtyDp : 2) : ""}
            placeholder="0.00"
            readOnly
            affix={assetSelect(receive, pickReceive, "Asset you receive")}
            helper=" "
            big
          />
        </Box>
      </Stack>

      <Box sx={{ my: 1.5, p: 1.25, border: "1px solid var(--mui-palette-divider)", borderRadius: "8px", display: "grid", gap: 0.75 }}>
        <Row label="Execution rate" value={rate > 0 ? `1 ${coin} ≈ ${fmt(rate, decimalsOf(market.priceIncrement))} ${quote}` : "–"} />
        <Row label="Fee" value="None" />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: -0.75, mb: 1.5 }}>
        Fills at the latest quote when you submit; it may differ from this estimate.
      </Typography>

      {error && (
        <Alert severity="error" role="alert" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {authed ? (
        <Button variant="contained" size="large" fullWidth disabled={!ready || busy} onClick={swap} startIcon={<Bolt />} sx={{ minHeight: 52, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          {busy ? "Swapping…" : ready ? `Swap ${pay} to ${receive}` : "Enter an amount"}
        </Button>
      ) : (
        <Button component={Link} href="/login?next=/swap" variant="contained" size="large" fullWidth sx={{ minHeight: 52 }}>
          Log in to swap
        </Button>
      )}
      {toastNode}
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}
