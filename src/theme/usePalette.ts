"use client";

import { useColorScheme } from "@mui/material/styles";
import { palettes } from "./theme";

// Concrete colour strings for canvas/SVG code that cannot read CSS variables.
export function usePalette() {
  const { colorScheme } = useColorScheme();
  return palettes[colorScheme === "light" ? "light" : "dark"];
}
