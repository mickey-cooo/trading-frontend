# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Existing scaffold kept: Next.js 16 (App Router, React Compiler), React 19, Redux Toolkit, axios. Components are MUI (`@mui/material` 9) throughout, `@mui/x-charts` for sparklines/donut/lines, TradingView `lightweight-charts` for candlesticks, `three` for the swap animation. Dev server on port 8005 because the backend CORS only allows `http://localhost:8005`.

## Users
Inferred from the PRD (user chose to skip the interview; nothing here was confirmed in conversation):
- Active spot traders who want a live candlestick chart with indicators and a fast order form.
- Casual users who want a one-screen swap between USDT and a coin.
- Investors who want to see what they hold and what it is worth.

## Product Purpose
ApexTrade is a crypto trading front end that pairs institutional speed with a low-error order flow: contextual Buy/Sell buttons, quick size chips, clear green/red semantics, and two comfortable themes (dark "Nocturne Trade", light "Glacial Capital"). Success per the PRD: order error rate under 0.05%, client-to-engine latency under 50 ms, swap conversion above 65%.

## Positioning
Order-entry safety and eye comfort in both light and dark, on top of a ledger-backed, idempotent order API.

## Operating Context
Backend: Spring Boot service at `trading-backend/trading`, base URL `http://localhost:8080/api/v1`.
- Public, no token: `GET /markets`, `/markets/{pair}/quote`, `/markets/{pair}/candles?interval=1m|5m|1h&limit<=500`, `/markets/{pair}/stream` (SSE, one candle JSON per quote).
- Auth: `POST /auth/register|login|refresh|logout`. Refresh tokens rotate; reusing an old one revokes the whole login family.
- Authenticated: `POST /orders` (needs `Idempotency-Key`; MARKET or LIMIT, spot only), `GET /orders?status=`, `POST /orders/{id}/cancel`, `GET /trades`, `GET /portfolio`, `GET /accounts/me/balances`, `GET /accounts/me/ledger`.
- All amounts and prices are decimal strings. New accounts start with demo USDT funding.
- Markets today: BTC-USDT, ETH-USDT. Prices come from an admin-published or simulated feed.

## Capabilities and Constraints
The PRD describes more than the backend offers. Not in the API, so not faked in the UI: L2 order book, derivatives/leverage/margin/positions, Stop-Limit, TP/SL, RFQ swap quotes, 24h volume, funding rates, sentiment/netflow, equity history, S&P benchmark, Sharpe, win rate, tx hashes, asset categories.
- Swap is implemented as a MARKET order against the USDT pair (so only USDT <-> coin). It fills at the latest quote at submit time, not a guaranteed quote.
- 24h change, high and low and sparklines are derived client-side from 1h candles.
- EMA, RSI and MACD are computed client-side from candles.
- Backend has no fees today.

## Evidence on Hand
Product brief (PRD) pasted in the first message. Backend source and docs at `/Users/mickey/Documents/Practice/trading-backend/trading`. No user research, analytics, or brand assets beyond the name "ApexTrade".

## Product Principles
- Never show a number the API did not give us; label derived numbers as derived.
- The submit button always says exactly what will happen (side, pair, size).
- Financial numerals are tabular and never jump layout when prices stream.
- Green and red mean buy/profit and sell/loss, nothing else.
- Both themes are first-class; neither is an afterthought.

## Accessibility & Inclusion
Primary actions at least 44px. Text contrast at least 4.5:1 in both themes (PRD hex values adjusted where they miss that bar). Gains and losses carry a sign or arrow, never colour alone. Respect `prefers-reduced-motion`.
