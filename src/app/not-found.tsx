import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h2 className="text-xl font-semibold">404 — Page not found</h2>
      <Link
        href="/"
        className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
      >
        Back home
      </Link>
    </div>
  );
}
