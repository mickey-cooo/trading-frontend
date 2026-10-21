"use client";

import TimerOutlined from "@mui/icons-material/TimerOutlined";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { Logo } from "@/components/common/Logo";

export function SessionExpiredView({ back }: { back: string }) {
  return (
    <Stack sx={{ minHeight: "100dvh", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Paper sx={{ width: "100%", maxWidth: 440, p: { xs: 2.5, sm: 4 } }}>
        <Stack spacing={2.5} sx={{ alignItems: "flex-start" }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Logo />
            <Typography variant="h2">ApexTrade</Typography>
          </Stack>
          <TimerOutlined sx={{ fontSize: 32, color: "muted" }} />
          <Stack spacing={0.75}>
            <Typography variant="h1" sx={{ fontSize: "1.5rem", lineHeight: "32px" }}>
              Your session expired
            </Typography>
            <Typography color="text.secondary">
              You were signed out. Log in again to pick up where you left off. Orders you already placed are not affected.
            </Typography>
          </Stack>
          <Stack spacing={1} sx={{ width: "100%" }}>
            <Button component={Link} href={`/login?next=${encodeURIComponent(back)}`} variant="contained" size="large" fullWidth>
              Log in again
            </Button>
            <Button component={Link} href="/markets" variant="outlined" size="large" fullWidth sx={{ minHeight: 48 }}>
              Browse markets
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
