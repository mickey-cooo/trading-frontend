import { Suspense } from "react";
import { MarketsPage } from "@/components/markets/MarketsPage";

export const metadata = { title: "Markets · ApexTrade" };

export default function Page() {
  return (
    <Suspense>
      <MarketsPage />
    </Suspense>
  );
}
