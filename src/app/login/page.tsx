import Box from "@mui/material/Box";
import { Suspense } from "react";
import { AuthForm } from "@/components/common/AuthForm";
import { LiveBackdrop } from "@/components/common/LiveBackdrop";

export const metadata = { title: "Log in · ApexTrade" };

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2 }}>
      <LiveBackdrop />
      <Suspense>
        <AuthForm />
      </Suspense>
    </Box>
  );
}
