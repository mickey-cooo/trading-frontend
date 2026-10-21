import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

// Data card from DESIGN.md: 40px header with a bottom rule, uppercase mono label,
// contextual actions on the right.
export function Panel({
  title,
  actions,
  children,
  flush,
  sx,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean; // no body padding, for tables and charts
  sx?: object;
}) {
  return (
    <Paper sx={{ display: "flex", flexDirection: "column", minWidth: 0, ...sx }}>
      {title && (
        <Box
          sx={{
            minHeight: 40,
            px: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            borderBottom: "1px solid var(--mui-palette-divider)",
          }}
        >
          <Typography variant="subtitle2" component="h2">
            {title}
          </Typography>
          {actions}
        </Box>
      )}
      <Box sx={{ p: flush ? 0 : 1.5, flex: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}
