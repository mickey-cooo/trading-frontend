"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export default function NotFound() {
  return (
    <Stack spacing={2} sx={{ alignItems: "center", justifyContent: "center", minHeight: "100dvh", p: 4, textAlign: "center" }}>
      <Typography variant="h2">That page does not exist</Typography>
      <Button component={Link} href="/trade" variant="contained" size="large">
        Back to the terminal
      </Button>
    </Stack>
  );
}
