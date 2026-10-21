import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <Stack spacing={1} sx={{ alignItems: "center", py: 4, px: 2, textAlign: "center" }}>
      <Typography variant="subtitle1">{title}</Typography>
      {hint && (
        <Typography color="text.secondary" sx={{ maxWidth: 380 }}>
          {hint}
        </Typography>
      )}
      {action}
    </Stack>
  );
}
