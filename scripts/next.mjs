// Runs `next <dev|start>` after loading .env, so PORT in .env sets the server port
// (Next itself only reads .env after it has already picked the port).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env: fall back to the shell's PORT or Next's default
}

const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [next, ...process.argv.slice(2)], { stdio: "inherit" });
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
