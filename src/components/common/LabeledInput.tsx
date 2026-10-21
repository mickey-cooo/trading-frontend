import Box from "@mui/material/Box";
import FormHelperText from "@mui/material/FormHelperText";
import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import Typography from "@mui/material/Typography";
import { useId, type ReactNode } from "react";

// Field from DESIGN.md: uppercase mono label above, optional right-hand note (AVAIL, BEST ASK),
// 36px mono input, asset affix locked on the right.
export function LabeledInput({
  label,
  note,
  value,
  onChange,
  affix,
  placeholder,
  error,
  helper,
  disabled,
  readOnly,
  big,
  inputMode = "decimal",
}: {
  label: string;
  note?: ReactNode;
  value: string;
  onChange?: (v: string) => void;
  affix?: ReactNode;
  placeholder?: string;
  error?: boolean;
  helper?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  big?: boolean;
  inputMode?: "decimal" | "text";
}) {
  const id = useId();
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.5, gap: 1 }}>
        <Typography variant="overline" component="label" htmlFor={id}>
          {label}
        </Typography>
        {note && (
          <Typography variant="caption" sx={{ fontFamily: "var(--font-mono)", color: "text.secondary" }}>
            {note}
          </Typography>
        )}
      </Box>
      <OutlinedInput
        id={id}
        fullWidth
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        inputProps={{ inputMode, style: big ? { fontSize: "1.5rem", fontWeight: 500, padding: "10px 12px" } : undefined }}
        endAdornment={
          affix ? (
            <InputAdornment position="end" sx={{ "& p": { fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "muted" } }}>
              {affix}
            </InputAdornment>
          ) : undefined
        }
      />
      {helper !== undefined && (
        <FormHelperText error={error} sx={{ mx: 0, mt: 0.5, minHeight: 16, fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}>
          {helper}
        </FormHelperText>
      )}
    </Box>
  );
}
