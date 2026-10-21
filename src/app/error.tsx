"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Stack spacing={2} sx={{ alignItems: "center", justifyContent: "center", minHeight: "100dvh", p: 4, textAlign: "center" }}>
      <Typography variant="h2">This screen failed to load</Typography>
      <Typography color="text.secondary">Your orders and balances are safe. Try again.</Typography>
      <Button onClick={reset} variant="contained" size="large">
        Reload screen
      </Button>
    </Stack>
  );
}
