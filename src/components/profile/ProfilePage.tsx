"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { LabeledInput } from "@/components/common/LabeledInput";
import { LoginPrompt } from "@/components/common/LoginPrompt";
import { Panel } from "@/components/common/Panel";
import { useToast } from "@/components/common/Toast";
import { usePolling } from "@/hooks/trading/usePolling";
import { useAccountEmail, useIsAuthed } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/axios/client";
import { fmtTime } from "@/lib/format";
import { createProfile, getMe, updateMe } from "@/services/user.service";
import type { UserProfile } from "@/types/trading";

export function ProfilePage() {
  const authed = useIsAuthed();
  const me = usePolling(getMe, 60_000, authed);

  if (!authed) {
    return (
      <Paper>
        <LoginPrompt title="Your profile is private" hint="Log in to view and edit your account details." />
      </Paper>
    );
  }
  if (me.error && !me.data) {
    return (
      <Alert severity="error" action={<Button onClick={me.reload}>Retry</Button>}>
        {me.error}
      </Alert>
    );
  }
  if (!me.data) return <Skeleton variant="rounded" height={320} />;
  return <ProfileForm me={me.data} onSaved={me.reload} />;
}

function ProfileForm({ me, onSaved }: { me: UserProfile; onSaved: () => void }) {
  const email = useAccountEmail();
  const [toast, toastNode] = useToast();
  const [first, setFirst] = useState(me.firstName ?? "");
  const [last, setLast] = useState(me.lastName ?? "");
  const [busy, setBusy] = useState(false);
  const hasProfile = !!me.firstName;
  const valid = first.trim() !== "" && last.trim() !== "" && first.length <= 100 && last.length <= 100;

  async function save() {
    setBusy(true);
    try {
      const input = { firstName: first.trim(), lastName: last.trim() };
      await (hasProfile ? updateMe(input) : createProfile(input));
      toast("Profile saved", "success");
      onSaved();
    } catch (e) {
      toast(getErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack sx={{ gap: 1.5, maxWidth: 560 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}>Profile</Typography>
      <Panel title="Account">
        <Stack sx={{ gap: 1.5 }}>
          <LabeledInput label="Email" value={email ?? ""} readOnly />
          <LabeledInput label="First name" value={first} onChange={setFirst} inputMode="text" />
          <LabeledInput label="Last name" value={last} onChange={setLast} inputMode="text" />
          <Typography variant="caption" color="text.secondary">
            {me.role ?? "USER"} · {me.status}{me.createdAt ? ` · member since ${fmtTime(me.createdAt)}` : ""}
          </Typography>
          <Button variant="contained" disabled={!valid || busy} onClick={save} sx={{ alignSelf: "flex-start" }}>
            {hasProfile ? "Save changes" : "Create profile"}
          </Button>
        </Stack>
      </Panel>
      {toastNode}
    </Stack>
  );
}
