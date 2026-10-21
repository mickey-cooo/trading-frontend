import { Suspense } from "react";
import { TradeTerminal } from "@/components/trade/TradeTerminal";

export const metadata = { title: "Trade · ApexTrade" };

export default function TradePage() {
  return (
    <Suspense>
      <TradeTerminal />
    </Suspense>
  );
}
