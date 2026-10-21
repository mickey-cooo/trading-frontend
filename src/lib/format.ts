// Display helpers. Backend values are decimal strings; Number() is for display and
// sizing only. shortcut: float math, fine at 8 decimals, move to a decimal lib for money maths.

export const toNumber = (v: string | number | null | undefined) =>
  v === null || v === undefined ? NaN : Number(v);

// "0.01" -> 2, "1" -> 0
export function decimalsOf(increment: string) {
  const dot = increment.indexOf(".");
  return dot === -1 ? 0 : increment.length - dot - 1;
}

export function fmt(v: string | number | null | undefined, decimals = 2) {
  const n = toNumber(v);
  if (!Number.isFinite(n)) return "–";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export const fmtUsd = (v: string | number | null | undefined) =>
  Number.isFinite(toNumber(v)) ? `$${fmt(v, 2)}` : "–";

// +1.23% / -0.40%
export function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "–";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;
}

// floors to the market increment, returns a plain decimal string ("0.01234")
export function floorTo(value: number, increment: string) {
  const step = Number(increment);
  if (!(step > 0) || !Number.isFinite(value)) return "0";
  const floored = Math.floor(value / step + 1e-9) * step;
  return floored.toFixed(decimalsOf(increment));
}

export function shortId(id: string) {
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function fmtTime(iso: string | number) {
  const d = typeof iso === "number" ? new Date(iso * 1000) : new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
