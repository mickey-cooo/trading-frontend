"use client";

import Alert, { type AlertColor } from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useCallback, useState, type ReactNode } from "react";

interface ToastState {
  message: string;
  severity: AlertColor;
  open: boolean;
}

// const [toast, node] = useToast(); render {node} once; toast("Saved", "success")
export function useToast(): [(message: string, severity?: AlertColor) => void, ReactNode] {
  const [state, setState] = useState<ToastState>({ message: "", severity: "info", open: false });
  const show = useCallback(
    (message: string, severity: AlertColor = "info") => setState({ message, severity, open: true }),
    [],
  );
  const node = (
    <Snackbar
      open={state.open}
      autoHideDuration={5000}
      onClose={(_, reason) => reason !== "clickaway" && setState((s) => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ mb: { xs: 8, md: 0 } }}
    >
      <Alert severity={state.severity} variant="filled" onClose={() => setState((s) => ({ ...s, open: false }))}>
        {state.message}
      </Alert>
    </Snackbar>
  );
  return [show, node];
}
