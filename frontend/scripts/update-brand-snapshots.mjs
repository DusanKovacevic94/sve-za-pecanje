import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const evidenceInput = process.env.BRAND_REVIEW_EVIDENCE;
if (!evidenceInput) {
  console.error(
    "Set BRAND_REVIEW_EVIDENCE to an approved Brand Manager review before updating snapshots."
  );
  process.exit(1);
}

const evidencePath = path.resolve(process.cwd(), evidenceInput);
if (!existsSync(evidencePath)) {
  console.error(`Brand review evidence does not exist: ${evidencePath}`);
  process.exit(1);
}

const evidence = readFileSync(evidencePath, "utf8");
if (!/## Verdict\s+`(?:approve|approve_with_notes)`/.test(evidence)) {
  console.error("Brand review evidence must contain an approve or approve_with_notes verdict.");
  process.exit(1);
}

console.log(`Using reviewed brand evidence: ${evidencePath}`);
const result = spawnSync(
  "pnpm",
  ["exec", "playwright", "test", "e2e/brand-visual.spec.ts", "--update-snapshots"],
  { cwd: process.cwd(), stdio: "inherit", shell: false }
);
process.exit(result.status ?? 1);
