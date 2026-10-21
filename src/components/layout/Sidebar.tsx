"use client";

import { useAppSelector } from "@/lib/hooks";

export function Sidebar() {
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <aside className="w-56 shrink-0 border-r border-black/10 p-4 dark:border-white/10">
      <nav className="flex flex-col gap-2 text-sm" />
    </aside>
  );
}
