"use client";

import { toggleSidebar } from "@/lib/slices/uiSlice";
import { useAppDispatch } from "@/lib/hooks";

export function Header() {
  const dispatch = useAppDispatch();

  return (
    <header className="flex h-14 items-center justify-between border-b border-black/10 px-4 dark:border-white/10">
      <button
        onClick={() => dispatch(toggleSidebar())}
        aria-label="Toggle sidebar"
        className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
      >
        ☰
      </button>
    </header>
  );
}
