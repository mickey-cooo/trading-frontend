"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { LabeledInput } from "@/components/common/LabeledInput";
import { LoginPrompt } from "@/components/common/LoginPrompt";
import { Panel } from "@/components/common/Panel";
import { useToast } from "@/components/common/Toast";
import { useMarkets } from "@/hooks/trading/useMarkets";
import { usePolling } from "@/hooks/trading/usePolling";
import { useIsAuthed } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/axios/client";
import { changeMarketStatus, changeUserStatus, publishQuote, type AdminStatus } from "@/services/admin.service";
import { getMe, getUser, getUsers } from "@/services/user.service";
import type { UserProfile } from "@/types/trading";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AdminPage() {
  const authed = useIsAuthed();
  const me = usePolling(getMe, 60_000, authed);

  if (!authed) {
    return (
      <Paper>
        <LoginPrompt title="Admin tools are private" hint="Log in with an admin account." />
      </Paper>
    );
  }
  if (me.error && !me.data) return <Alert severity="error">{me.error}</Alert>;
  if (!me.data) return <Skeleton variant="rounded" height={240} />;
  // display gate only: every /admin/** call is checked by the backend
  if (me.data.role !== "ADMIN") return <Alert severity="warning">Admin role required.</Alert>;
  return <AdminTools adminId={me.data.id} />;
}

function AdminTools({ adminId }: { adminId: string }) {
  const [toast, toastNode] = useToast();
  const markets = useMarkets();
  const [pair, setPair] = useState("");
  const [price, setPrice] = useState("");
  const [ids, setIds] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const selected = pair || markets.data?.[0]?.pair || "";

  async function run(action: () => Promise<string>) {
    setBusy(true);
    try {
      toast(await action(), "success");
    } catch (e) {
      toast(getErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const lookup = () =>
    run(async () => {
      const list = ids.split(/[\s,]+/).filter(Boolean);
      if (list.length === 0 || list.length > 100 || !list.every((i) => UUID.test(i))) throw new Error("Enter 1-100 user ids");
      setUsers(list.length === 1 ? [await getUser(list[0])] : await getUsers(list));
      return "Users loaded";
    });

  const setUserStatus = (id: string, status: AdminStatus) =>
    run(async () => {
      const updated = await changeUserStatus(id, status);
      setUsers((us) => us.map((u) => (u.id === id ? updated : u)));
      return `User ${status.toLowerCase()}`;
    });

  return (
    <Stack sx={{ gap: 1.5, maxWidth: 720 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>Admin</Typography>

      <Panel title="Market">
        <Stack sx={{ gap: 1.5 }}>
          <Select size="small" value={selected} onChange={(e) => setPair(e.target.value)} inputProps={{ "aria-label": "Pair" }}>
            {markets.data?.map((m) => (
              <MenuItem key={m.pair} value={m.pair}>{m.pair} · {m.status}</MenuItem>
            ))}
          </Select>
          <LabeledInput label="Quote price" value={price} onChange={setPrice} affix="USDT" placeholder="65000.50" />
          <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
            <Button variant="contained" disabled={busy || !selected || !price.trim()} onClick={() => run(async () => `Published ${(await publishQuote(selected, price.trim())).price}`)}>
              Publish quote
            </Button>
            {(["ACTIVE", "SUSPENDED"] as const).map((s) => (
              <Button key={s} variant="outlined" disabled={busy || !selected} onClick={() => run(async () => { await changeMarketStatus(selected, s); markets.reload(); return `${selected} ${s.toLowerCase()}`; })}>
                {s === "ACTIVE" ? "Activate" : "Suspend"}
              </Button>
            ))}
          </Stack>
        </Stack>
      </Panel>

      <Panel title="Users">
        <Stack sx={{ gap: 1.5 }}>
          <LabeledInput label="User ids" value={ids} onChange={setIds} inputMode="text" placeholder="uuid, uuid, …" />
          <Button variant="outlined" disabled={busy || !ids.trim()} onClick={lookup} sx={{ alignSelf: "flex-start" }}>Look up</Button>
          {users.map((u) => (
            <Stack key={u.id} direction="row" sx={{ gap: 1, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <Typography variant="body2" sx={{ fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                {u.id} · {[u.firstName, u.lastName].filter(Boolean).join(" ") || "no profile"} · {u.role ?? "USER"} · {u.status}
              </Typography>
              <Stack direction="row" sx={{ gap: 1 }}>
                {(["ACTIVE", "SUSPENDED"] as const).map((s) => (
                  <Button key={s} size="small" variant="outlined" disabled={busy || u.id === adminId || u.status === s || u.status === "DELETED"} onClick={() => setUserStatus(u.id, s)}>
                    {s === "ACTIVE" ? "Activate" : "Suspend"}
                  </Button>
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Panel>
      {toastNode}
    </Stack>
  );
}
