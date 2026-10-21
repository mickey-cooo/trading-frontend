import { createTheme } from "@mui/material/styles";

// Nocturne Trade (dark) and Glacial Capital (light). Hexes follow the PRD; the few that
// miss 4.5:1 as text or as a button fill are darkened (see PRODUCT.md, Accessibility).
// Raw palettes, also read by the canvas chart which cannot resolve CSS variables.
declare module "@mui/material/styles" {
  interface Palette {
    surface: string;
    outline: string;
    muted: string;
  }
  interface PaletteOptions {
    surface?: string;
    outline?: string;
    muted?: string;
  }
}

// Glacial Capital (light) from docs/stitch_modern_trading_platform/glacial_capital/DESIGN.md.
// Where the DESIGN.md hex misses 4.5:1 as text or as a button fill it is darkened one step:
// primary #0284C7 -> #0369A1 (its own hover colour), emerald-600 -> emerald-700.
// Dark is the PRD's Nocturne Trade, built on the same shapes and type.
// Raw objects are also read by canvas code that cannot resolve CSS variables.
export const palettes = {
  light: {
    primary: { main: "#0369A1", light: "#0284C7", contrastText: "#FFFFFF" },
    success: { main: "#047857", contrastText: "#FFFFFF" },
    error: { main: "#E11D48", contrastText: "#FFFFFF" },
    info: { main: "#0369A1" },
    background: { default: "#F8FAFC", paper: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "#475569" },
    divider: "#E2E8F0",
    surface: "#F1F5F9",
    outline: "#CBD5E1",
    muted: "#64748B",
  },
  dark: {
    primary: { main: "#26A69A", light: "#4DB6AC", contrastText: "#0F131E" },
    success: { main: "#10B981", contrastText: "#0F131E" },
    error: { main: "#F43F5E", contrastText: "#0F131E" },
    info: { main: "#38BDF8" },
    background: { default: "#0F131E", paper: "#171B26" },
    text: { primary: "#F1F5F9", secondary: "#94A3B8" },
    divider: "#2A2F3D",
    surface: "#1E2433",
    outline: "#3A4152",
    muted: "#8B97AB",
  },
};

const MONO = "var(--font-mono), ui-monospace, monospace";

const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data" },
  // xl starts at 1360 so the tick tape and header ticker fit on a 1440 laptop
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1360 } },
  colorSchemes: {
    light: { palette: palettes.light },
    dark: { palette: palettes.dark },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: "var(--font-ui), system-ui, sans-serif",
    fontSize: 13,
    h1: { fontSize: "2rem", lineHeight: "40px", fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontSize: "1.375rem", lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.01em" },
    h3: { fontSize: "1.125rem", lineHeight: "24px", fontWeight: 600, letterSpacing: "-0.005em" },
    h4: { fontSize: "0.9375rem", lineHeight: "20px", fontWeight: 600 },
    subtitle1: { fontSize: "0.9375rem", lineHeight: "20px", fontWeight: 600 },
    subtitle2: { fontSize: "0.8125rem", lineHeight: "18px", fontWeight: 600 },
    body1: { fontSize: "0.9375rem", lineHeight: "22px" },
    body2: { fontSize: "0.8125rem", lineHeight: "18px", letterSpacing: "0.005em" },
    caption: { fontSize: "0.75rem", lineHeight: "16px", letterSpacing: "0.01em" },
    // label-md: uppercase mono micro-label
    overline: {
      fontFamily: MONO,
      fontSize: "0.6875rem",
      lineHeight: "14px",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (t) => ({
        body: {
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum" 1',
          minHeight: "100vh",
        },
        "::selection": {
          backgroundColor: t.vars.palette.primary.main,
          color: t.vars.palette.primary.contrastText,
        },
        "*": {
          scrollbarWidth: "thin",
          scrollbarColor: `${t.vars.palette.outline} transparent`,
        },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 36, borderRadius: 4 },
        sizeLarge: { minHeight: 48, fontSize: "0.9375rem" },
        outlined: {
          backgroundColor: "var(--mui-palette-background-paper)",
          borderColor: "var(--mui-palette-divider)",
          color: "var(--mui-palette-text-primary)",
          "&:hover": { backgroundColor: "var(--mui-palette-surface)", borderColor: "var(--mui-palette-outline)" },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid var(--mui-palette-divider)",
          borderRadius: 8,
          boxShadow: "0 1px 3px 0 rgba(15,23,42,0.03), 0 1px 2px -1px rgba(15,23,42,0.03)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: "var(--mui-palette-background-paper)",
          fontFamily: MONO,
          fontSize: "0.8125rem",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--mui-palette-outline)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--mui-palette-muted)" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "var(--mui-palette-primary-light)",
            borderWidth: 1,
            boxShadow: "0 0 0 1px var(--mui-palette-primary-light)",
          },
          "&.Mui-disabled": { backgroundColor: "var(--mui-palette-surface)" },
        },
        input: { padding: "9px 12px" },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: "0.8125rem" } } },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: "var(--mui-palette-surface)",
          border: "1px solid var(--mui-palette-divider)",
          borderRadius: 4,
          padding: 2,
          gap: 2,
          "& .MuiToggleButton-root": {
            border: 0,
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 500,
            minHeight: 28,
            color: "var(--mui-palette-text-secondary)",
            "&:hover": { backgroundColor: "transparent", color: "var(--mui-palette-text-primary)" },
            "&.Mui-selected": {
              backgroundColor: "var(--mui-palette-background-paper)",
              color: "var(--mui-palette-primary-main)",
              fontWeight: 700,
              boxShadow: "0 1px 2px 0 rgba(15,23,42,0.08)",
              "&:hover": { backgroundColor: "var(--mui-palette-background-paper)" },
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4, fontFamily: MONO, fontSize: "0.6875rem", fontWeight: 500, height: 28 },
        outlined: { borderColor: "var(--mui-palette-divider)" },
      },
    },
    MuiTabs: {
      styleOverrides: { root: { minHeight: 40 }, indicator: { height: 2 } },
    },
    MuiTab: {
      styleOverrides: { root: { minHeight: 40, textTransform: "none", fontWeight: 500, fontSize: "0.875rem" } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "var(--mui-palette-divider)",
          padding: "8px 12px",
          fontSize: "0.8125rem",
          "&.MuiTableCell-alignRight, &.MuiTableCell-alignCenter": { fontFamily: MONO, fontSize: "0.75rem" },
        },
        head: {
          fontFamily: MONO,
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--mui-palette-muted)",
          backgroundColor: "var(--mui-palette-surface)",
          "&.MuiTableCell-alignRight": { fontFamily: MONO, fontSize: "0.6875rem" },
        },
      },
    },
    MuiTableRow: { styleOverrides: { root: { "&.MuiTableRow-hover:hover": { backgroundColor: "var(--mui-palette-surface)" } } } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 8 } } },
  },
});

export default theme;
