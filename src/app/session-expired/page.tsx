import { SessionExpiredView } from "@/components/common/SessionExpiredView";
import { safeNext } from "@/lib/auth/redirect";

export const metadata = { title: "Session expired · ApexTrade" };

export default async function SessionExpiredPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <SessionExpiredView back={safeNext(typeof next === "string" ? next : null)} />;
}
