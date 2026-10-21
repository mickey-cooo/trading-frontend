"use client";

import DarkMode from "@mui/icons-material/DarkModeOutlined";
import LightMode from "@mui/icons-material/LightModeOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";

export function ThemeToggle() {
  const { colorScheme, setMode } = useColorScheme();
  const dark = colorScheme === "dark";
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(dark ? "light" : "dark")} sx={{ width: 44, height: 44 }}>
        {dark ? <LightMode /> : <DarkMode />}
      </IconButton>
    </Tooltip>
  );
}
