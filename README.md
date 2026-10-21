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
│   ├── axios/client.ts     # axios instance pointed at the same-origin BFF
│   ├── auth/               # session flag cookie hooks, safeNext
│   ├── bff/server.ts       # BFF helpers: cookies, single-flight refresh, origin check
│   ├── indicators.ts, stats.ts, format.ts
│   └── store.ts, slices/   # Redux store, UI slice
├── theme/                  # MUI theme and registry
├── types/trading.ts        # API types
├── app/api/bff/            # BFF route: attaches the token from HttpOnly cookies, renews it
└── proxy.ts                # CSP nonce + signed-out redirect
```

## Auth and security

- Tokens never reach page script. The browser calls the same-origin BFF (`src/app/api/bff/[...path]/route.ts`), which keeps the access (`at`) and refresh (`rt`) tokens in HttpOnly, SameSite=Lax cookies (Secure on https), adds the Bearer header and calls the backend. The `has_session` cookie is a readable flag (with the email, for display) so the UI knows whether to show signed-in views.
- On a backend 401 the BFF refreshes once and retries. Refresh tokens rotate and a reused one revokes the login, so refreshes are single-flight per token in memory: run one Node instance, or use sticky sessions. A rejected refresh clears the cookies and answers 401 with `x-session-expired: 1`.
- State-changing BFF calls need an `Origin` matching the host (CSRF), so a reverse proxy must pass `Host` or `X-Forwarded-Host` through unchanged. `/api/*` skips `src/proxy.ts`, so the BFF route does its own checks.
- `src/proxy.ts` redirects signed-out visitors away from `/portfolio`, `/profile` and `/admin` when the `rt` cookie is missing. It is a hint; the backend checks the token on every request.
- `src/proxy.ts` sets a per-request nonce CSP, so every page renders dynamically. `next.config.ts` adds `X-Frame-Options`, nosniff and referrer headers.
- The candle SSE stream still connects to the backend directly (public data, no token), so `NEXT_PUBLIC_API_BASE_URL` stays in the CSP `connect-src`. The backend base URL is also what the BFF server calls.

## Notes

- All amounts and prices are decimal strings from the API.
- 24h change, high/low, sparklines and EMA/RSI/MACD are computed client-side from candles.
- This Next.js version has breaking changes; read `node_modules/next/dist/docs/` before changing framework-level code (see `AGENTS.md`).
