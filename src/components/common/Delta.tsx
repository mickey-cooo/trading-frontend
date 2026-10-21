import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import ArrowDropUp from "@mui/icons-material/ArrowDropUp";
import Box from "@mui/material/Box";
import { fmtPct } from "@/lib/format";

// Signed percent chip (DESIGN.md delta chips): tinted fill, 1px tinted border, arrow glyph so
// gain and loss never rely on colour alone.
export function Delta({ value, plain, sx }: { value: number; plain?: boolean; sx?: object }) {
  if (!Number.isFinite(value)) return <Box component="span" sx={{ color: "text.secondary", ...sx }}>–</Box>;
  const up = value >= 0;
  const c = up ? "success" : "error";
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 1,
        color: `${c}.main`,
        ...(plain
          ? {}
          : {
              px: 0.75,
              py: 0.5,
              borderRadius: "4px",
              bgcolor: `rgb(from var(--mui-palette-${c}-main) r g b / 0.1)`,
              border: `1px solid rgb(from var(--mui-palette-${c}-main) r g b / 0.2)`,
            }),
        ...sx,
      }}
    >
      {up ? <ArrowDropUp sx={{ fontSize: 16, mx: -0.5 }} /> : <ArrowDropDown sx={{ fontSize: 16, mx: -0.5 }} />}
      {fmtPct(value).replace(/^[+−]/, up ? "+" : "−")}
    </Box>
  );
}
