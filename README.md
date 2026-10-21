# ApexTrade

Crypto spot-trading front end: live candlestick terminal, one-screen swap, portfolio and admin price publishing. Dark ("Nocturne Trade") and light ("Glacial Capital") themes. See [PRODUCT.md](PRODUCT.md) for the product brief and what the backend does not offer.

## Stack

- Next.js 16 (App Router, React Compiler), React 19, TypeScript
- MUI 9 (`@mui/material`, `@mui/x-charts`), Emotion
- TradingView `lightweight-charts` for candles, `three` for the swap animation
- Redux Toolkit for UI state, Axios for the API, `react-hook-form` + `yup` for forms

## Getting started

Needs the Spring Boot backend running (default `http://localhost:8080/api/v1`).

```bash
yarn install
cp .env.example .env
yarn dev
```

Open [http://localhost:8005](http://localhost:8005). The port is `PORT` in `.env`; the backend CORS only allows 8005.

| Script | What it does |
|---|---|
| `yarn dev` | dev server, loads `.env` first so `PORT` applies |
| `yarn build` | production build |
| `yarn start` | serve the production build |
| `yarn lint` | eslint |

### Environment

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080/api/v1` | backend base URL, also allowed in the CSP `connect-src` |
| `PORT` | `8005` | dev/start server port |

## Routes

| Route | Access | Page |
|---|---|---|
| `/trade` | public | candlestick chart, EMA/RSI/MACD, order form, orders deck |
| `/markets` | public | all markets with 24h stats and sparklines |
| `/swap` | public | USDT <-> coin swap (a MARKET order) |
| `/portfolio` | signed in | balances, allocation, account activity |
| `/profile` | signed in | view and edit account details |
| `/admin` | signed in | publish prices |
| `/login`, `/session-expired` | public | auth |

## Folder structure

```
src/
├── app/
│   ├── (app)/              # routes inside the app shell: trade, markets, swap, portfolio, profile, admin
│   ├── login/, session-expired/
│   ├── layout.tsx          # root layout: theme, store, per-request CSP nonce
│   └── api/health/         # route handler
├── components/             # per-page UI: trade, markets, swap, portfolio, profile, admin
│   ├── layout/             # AppShell, TickerStrip (scrolling prices), AccountMenu, ThemeToggle
│   └── common/             # shared UI: Panel, Delta, Sparkline, Toast, ...
├── hooks/trading/          # data hooks: markets, snapshots, candle feed (SSE), polling
├── services/               # API calls, one file per domain
├── lib/
│   ├── axios/client.ts     # axios instance: Bearer token, single-flight refresh
│   ├── auth/               # token session (localStorage + flag cookie), safeNext
│   ├── indicators.ts, stats.ts, format.ts
│   └── store.ts, slices/   # Redux store, UI slice
├── theme/                  # MUI theme and registry
├── types/trading.ts        # API types
└── proxy.ts                # CSP nonce + signed-out redirect
```

## Auth and security

- Access and refresh tokens live in `localStorage`. A `has_session` flag cookie lets `src/proxy.ts` redirect signed-out visitors away from `/portfolio`, `/profile` and `/admin`. It is a hint only; the API checks the Bearer token on every request.
- Refresh tokens rotate and a reused one revokes the login, so refreshes run one at a time across tabs (`navigator.locks`).
- `src/proxy.ts` sets a per-request nonce CSP, so every page renders dynamically. `next.config.ts` adds `X-Frame-Options`, nosniff and referrer headers.
- Known gap: tokens in `localStorage` are readable by any script that runs on the page. Moving the refresh token to an httpOnly cookie needs backend support.

## Notes

- All amounts and prices are decimal strings from the API.
- 24h change, high/low, sparklines and EMA/RSI/MACD are computed client-side from candles.
- This Next.js version has breaking changes; read `node_modules/next/dist/docs/` before changing framework-level code (see `AGENTS.md`).
