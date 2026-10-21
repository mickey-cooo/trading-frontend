import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";

// Three rising bars inside a rounded square: the mark for ApexTrade
export function Logo(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--mui-palette-primary-main)" />
      <rect x="5.5" y="12.5" width="3" height="6" rx="1" fill="var(--mui-palette-primary-contrastText)" />
      <rect x="10.5" y="8.5" width="3" height="10" rx="1" fill="var(--mui-palette-primary-contrastText)" />
      <rect x="15.5" y="4.5" width="3" height="14" rx="1" fill="var(--mui-palette-primary-contrastText)" />
    </SvgIcon>
  );
}
