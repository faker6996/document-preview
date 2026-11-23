#!/usr/bin/env node

// Prepares a release: bumps the version, commits, and creates the annotated tag `vX.Y.Z`.
// Publishing happens in CI (.github/workflows/publish-package.yml) when the tag reaches GitHub.
//
// Usage: node scripts/release.mjs [patch|minor|major|prerelease|prepatch|preminor|premajor] [--preid=beta] [--push]

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUMPS = ["patch", "minor", "major", "prerelease", "prepatch", "preminor", "premajor"];

function run(command, options = {}) {
  console.log(`$ ${command}`);
  return execSync(command, { stdio: "inherit", ...options });
}

function read(command, options = {}) {
  return execSync(command, { encoding: "utf8", ...options }).trim();
}

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const result = { bump: "patch", preid: null, push: false };
  for (const argument of argv.slice(2)) {
    if (BUMPS.includes(argument)) result.bump = argument;
    else if (argument.startsWith("--preid=")) result.preid = argument.slice("--preid=".length);
    else if (argument === "--push") result.push = true;
    else fail(`Unknown argument: ${argument}`);
  }
  if (result.bump.startsWith("pre") && !result.preid) result.preid = "beta";
  return result;
}

function main() {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  process.chdir(repoRoot);
  const { bump, preid, push } = parseArgs(process.argv);

  // Releases are cut from an up-to-date, clean main so the tag points at reviewed code.
  const branch = read("git rev-parse --abbrev-ref HEAD");
  if (branch !== "main") fail(`Releases must be cut from main (current branch: ${branch}).`);
  if (read("git status --porcelain")) fail("Working tree is not clean. Commit or stash changes first.");
  run("git fetch --quiet origin main --tags");
  if (read("git rev-parse HEAD") !== read("git rev-parse origin/main")) {
    fail("Local main differs from origin/main. Pull or push first.");
  }

  run(`npm version ${bump}${preid ? ` --preid=${preid}` : ""} --no-git-tag-version`);
  const { name, version } = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const tag = `v${version}`;
  if (read(`git tag --list ${tag}`)) fail(`Tag ${tag} already exists.`);

  run("git add package.json package-lock.json");
  run(`git commit -m "chore(release): ${name}@${version}"`);
  run(`git tag -a ${tag} -m "Release ${tag}"`);

  const pushCommand = `git push --atomic origin main ${tag}`;
  if (push) {
    run(pushCommand);
    console.log(`\n✔ Pushed ${tag}. GitHub Actions will verify and publish ${name}@${version}.`);
  } else {
    console.log(`\n✔ Prepared ${tag} locally. Push it to publish:\n\n  ${pushCommand}\n`);
    console.log(`To undo before pushing: git tag -d ${tag} && git reset --hard HEAD~1`);
  }
}

main();
