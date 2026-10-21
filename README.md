Fork-able Next.js starter. App Router · TypeScript · React · Redux Toolkit · Tailwind CSS. Ships one generic `example` domain as a working pattern to copy — replace/delete it once you've added your own.

## Getting started

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Folder structure

```
src/
├── app/                        # routes only — folders = URL segments
│   ├── layout.tsx              # root layout (wraps app in <StoreProvider>)
│   ├── page.tsx                # home route ("/")
│   ├── loading.tsx             # loading UI (Suspense boundary)
│   ├── error.tsx               # error boundary
│   ├── not-found.tsx           # 404 UI
│   └── api/health/route.ts     # example route handler
│
├── components/
│   ├── layout/                 # generic app chrome: AppLayout, Header, Sidebar
│   └── common/                 # generic reusable UI: Button, Modal, LoadingSpinner
├── hooks/
│   └── common/                 # generic reusable hook: useFileUpload
├── services/
│   └── example.service.ts      # example: functions calling apiClient, normalized errors
├── lib/
│   ├── axios/client.ts         # one configured axios instance (JWT refresh + 401 redirect)
│   ├── slices/uiSlice.ts       # generic UI state (sidebar/theme) — not domain data
│   ├── store.ts                # configureStore, registers slices
│   ├── hooks.ts                # typed useAppSelector / useAppDispatch
│   └── store-provider.tsx      # <StoreProvider> client wrapper
├── types/
│   └── example.type.ts         # example: shape of a domain type file
└── app/globals.css
```

`app/` holds routing files only. Anything reusable across routes (components, hooks, services, types, state) lives in the matching top-level `src/` folder — per [Next.js's recommended project organization](https://nextjs.org/docs/app/getting-started/project-structure#organizing-your-project).

## Adding your first domain

One data domain = one service file + one types file + one state slice. Don't mix domains in one file. Use `example.*` as the template:

1. `src/types/<domain>.type.ts` — shared TS types for the domain (see `example.type.ts`)
2. `src/services/<domain>.service.ts` — API calls for the domain, using `apiClient` from `src/lib/axios/client.ts`, errors normalized via `isAxiosError` (see `example.service.ts`)
3. `src/lib/slices/<domain>Slice.ts` — Redux Toolkit slice, then register its reducer in `src/lib/store.ts`
4. `src/hooks/<domain>/use<Domain>.ts` — wraps the service + dispatch/selector calls; business logic (fetching, mutating) lives here, not in components
5. `src/components/<domain>/...` — presentational components that call the hook
6. `src/app/<route>/page.tsx` — wire the route to the hook/components

Once your first real domain exists, delete `example.service.ts` / `example.type.ts` — they're a pattern to copy, not a dependency.

### Layout chrome

`components/layout/AppLayout` (+ `Header`, `Sidebar`) is a generic shell wired to `uiSlice`'s `sidebarOpen` state. It's not wired into `app/layout.tsx` by default — wrap your routes with it once you have real navigation to show.

### Routing conventions (standard Next.js, use as needed)

- Route groups `(group)` — organize routes without affecting the URL, e.g. `app/(marketing)/about/page.tsx`
- Private folders `_folder` — opt a folder out of routing, e.g. `app/blog/_components/`
- Per-segment `loading.tsx` / `error.tsx` / `not-found.tsx` — add alongside a route's `page.tsx` when that segment needs its own boundary

### Hook convention

In every hook/component, declare all `useState` calls first, grouped at the top, before any `useEffect` (or other hook) calls. Don't interleave state with effects. See `useFileUpload` for an example.

## Stack

- [Next.js App Router](https://nextjs.org/docs/app)
- TypeScript
- Redux Toolkit + React Redux (`src/lib/store.ts`, `src/lib/slices/`)
- Axios (`src/lib/axios/client.ts`)
- Tailwind CSS
