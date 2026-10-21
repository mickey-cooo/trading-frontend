"use client";

import Logout from "@mui/icons-material/Logout";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Typography from "@mui/material/Typography";
import { useAccountEmail, useIsAuthed } from "@/lib/auth/session";
import { usePolling } from "@/hooks/trading/usePolling";
import { logout } from "@/services/auth.service";
import { getMe } from "@/services/user.service";

export function AccountMenu() {
  const authed = useIsAuthed();
  const email = useAccountEmail();
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const isAdmin = usePolling(getMe, 300_000, authed).data?.role === "ADMIN";

  if (!authed) {
    return (
      <Button component={Link} href="/login" variant="contained" sx={{ minHeight: 40 }}>
        Log in
      </Button>
    );
  }

  return (
    <>
      <IconButton aria-label="Account" onClick={(e) => setAnchor(e.currentTarget)} sx={{ width: 44, height: 44 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", color: "primary.contrastText", fontSize: "0.875rem", fontWeight: 700 }}>
          {email ? email.charAt(0).toUpperCase() : "?"}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {email && [
          <Typography key="email" variant="body2" color="text.secondary" sx={{ px: 2, py: 1, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
            {email}
          </Typography>,
          <Divider key="rule" />,
        ]}
        <MenuItem component={Link} href="/profile" onClick={() => setAnchor(null)}>
          Profile
        </MenuItem>
        {isAdmin && (
          <MenuItem component={Link} href="/admin" onClick={() => setAnchor(null)}>
            Admin
          </MenuItem>
        )}
        <MenuItem
          onClick={async () => {
            setAnchor(null);
            await logout().catch(() => undefined); // tokens are cleared even when the call fails
            router.push("/markets");
          }}
        >
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}
