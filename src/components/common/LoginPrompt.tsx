"use client";

import LockOutlined from "@mui/icons-material/LockOutlined";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function LoginPrompt({ title, hint }: { title: string; hint: string }) {
  const next = usePathname();
  return (
    <Stack spacing={1.5} sx={{ alignItems: "center", py: 5, px: 2, textAlign: "center" }}>
      <LockOutlined color="disabled" />
      <Typography variant="h3">{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
        {hint}
      </Typography>
      <Button
        component={Link}
        href={`/login?next=${encodeURIComponent(next)}`}
        variant="contained"
        size="large"
      >
        Log in or create account
      </Button>
    </Stack>
  );
}
