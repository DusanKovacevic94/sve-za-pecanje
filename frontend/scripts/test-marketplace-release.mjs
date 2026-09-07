import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const frontend = fileURLToPath(new URL("../", import.meta.url));

// --repeat-each shares a database across repetitions. SEO and transaction fixtures
// change inventory, so subsequent visual baselines would see a different scenario.
// Each process owns fresh Playwright webServers and their dedicated e2e.db/uploads.
for (let pass = 1; pass <= 3; pass += 1) {
  console.log(`Marketplace release pass ${pass}/3 (fresh fixtures, no retries)`);
  const result = spawnSync("pnpm", ["test:e2e", "--workers=1"], {
    cwd: frontend,
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
