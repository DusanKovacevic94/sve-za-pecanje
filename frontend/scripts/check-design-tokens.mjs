import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(frontendRoot, "src");
const scanRoots = [path.join(sourceRoot, "app"), path.join(sourceRoot, "components")];
const excludedDirectories = [
  path.join(sourceRoot, "app", "admin"),
  path.join(sourceRoot, "app", "dev"),
  path.join(sourceRoot, "components", "admin"),
  path.join(sourceRoot, "components", "brand"),
  path.join(sourceRoot, "components", "icons"),
];

const rules = [
  {
    name: "font-black",
    pattern: /\bfont-black\b/g,
    guidance: "Use the page, section, or card heading primitive instead.",
  },
  {
    name: "unsupported neutral palette",
    pattern: /\b(?:text|bg|border|divide|ring|placeholder)-(?:slate|gray|zinc|neutral)-[\w/.[\]-]+/g,
    guidance: "Use Ink for neutral text and Sand for neutral surfaces and borders.",
  },
  {
    name: "unsupported radius",
    pattern: /\brounded-(?:sm|md|lg)\b/g,
    guidance: "Use rounded-xl, rounded-2xl, or rounded-full for pills.",
  },
  {
    name: "unclassified shadow",
    pattern: /\bshadow-(?:sm|md|lg|xl|2xl)\b/g,
    guidance: "Use shadow-soft, shadow-lift, shadow-button, or an approved overlay shadow.",
  },
  {
    name: "hard-coded color",
    pattern: /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\s*\(/gi,
    guidance: "Declare the value as a named design token before using it in customer UI.",
  },
];

function isExcluded(directory) {
  return excludedDirectories.some(
    (excluded) => directory === excluded || directory.startsWith(`${excluded}${path.sep}`),
  );
}

async function collectTsxFiles(directory) {
  if (isExcluded(directory)) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectTsxFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".tsx") ? [entryPath] : [];
    }),
  );
  return files.flat();
}

const files = (await Promise.all(scanRoots.map(collectTsxFiles))).flat().sort();
const failures = [];

for (const file of files) {
  const contents = await readFile(file, "utf8");
  const lines = contents.split(/\r?\n/);

  lines.forEach((line, index) => {
    rules.forEach((rule) => {
      rule.pattern.lastIndex = 0;
      const matches = [...line.matchAll(rule.pattern)];
      matches.forEach((match) => {
        failures.push({
          file: path.relative(frontendRoot, file),
          line: index + 1,
          column: (match.index ?? 0) + 1,
          match: match[0],
          ...rule,
        });
      });
    });
  });
}

if (failures.length) {
  console.error("Customer UI design-token check failed:\n");
  failures.forEach(({ file, line, column, match, name, guidance }) => {
    console.error(`${file}:${line}:${column}  ${name}: ${match}`);
    console.error(`  ${guidance}`);
  });
  process.exitCode = 1;
} else {
  console.log(`Design-token check passed (${files.length} customer-facing components).`);
}
