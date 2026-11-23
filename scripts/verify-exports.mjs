#!/usr/bin/env node
// Fails if a file referenced by package.json (main/module/types/exports) is missing from dist.
// Guards against shipping a build without type declarations (as happened in 0.1.0).
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const targets = new Set([pkg.main, pkg.module, pkg.types].filter(Boolean));
const collect = (value) => {
  if (typeof value === "string") targets.add(value);
  else if (value && typeof value === "object") Object.values(value).forEach(collect);
};
collect(pkg.exports);

const missing = [...targets].filter((file) => file.startsWith("./dist/") && !fs.existsSync(file));
if (missing.length > 0) {
  console.error(`Missing build outputs referenced by package.json:\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log(`All ${targets.size} package entry files exist.`);
