#!/usr/bin/env node

// Decides whether a push to main should release, and prepares the release.
// Used by .github/workflows/publish-package.yml; run locally with --dry-run to preview.
//
//   1. package.json version not on npm yet (manual bump / `npm run release`) -> publish that version.
//   2. Otherwise look at commits since tag v<version>:
//      - no release-relevant file changed (src/, package.json, package-lock.json, README.md) -> no release
//      - "[skip release]" in the subject of the newest commit -> no release
//      - breaking change ("type!:" or "BREAKING CHANGE") -> major (minor while < 1.0.0)
//      - "feat" -> minor, anything else -> patch
//      Bumps package.json/package-lock.json and prepends a CHANGELOG.md section.
//
// Writes `release`, `version`, `bumped` to $GITHUB_OUTPUT (when set) and prints a summary.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";

const RELEASE_PATHS = [/^src\//, /^package\.json$/, /^package-lock\.json$/, /^README\.md$/];
const RELEASE_COMMIT = /^chore\(release\):/;
const dryRun = process.argv.includes("--dry-run");

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function isPublished(name, version) {
  try {
    const out = execFileSync("npm", ["view", `${name}@${version}`, "version", "--registry=https://registry.npmjs.org"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return out === version;
  } catch (error) {
    // 404 = not published; anything else must stop the release.
    if (String(error.stderr || "").includes("E404")) return false;
    throw error;
  }
}

function bumpVersion(version, level) {
  const [major, minor, patch] = version.split("-")[0].split(".").map(Number);
  if (level === "major") return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function output(values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
}

function main() {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const { name, version } = pkg;

  if (!isPublished(name, version)) {
    console.log(`${name}@${version} is not on npm yet: publishing it as is.`);
    return output({ release: "true", version, bumped: "false" });
  }

  const baseTag = `v${version}`;
  if (!git("tag", "--list", baseTag)) {
    console.log(`Tag ${baseTag} not found; nothing to compare against. No release.`);
    return output({ release: "false", version, bumped: "false" });
  }

  const range = `${baseTag}..HEAD`;
  const commits = git("log", range, "--format=%H%x1f%s%x1f%b%x1e")
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject, body = ""] = entry.split("\x1f");
      return { hash, subject, body };
    })
    .filter((commit) => !RELEASE_COMMIT.test(commit.subject));

  if (commits.length === 0) {
    console.log(`No commits since ${baseTag}. No release.`);
    return output({ release: "false", version, bumped: "false" });
  }

  // Opt-out applies to this push only: the subject of the newest commit (not older commits or bodies,
  // which would block every later release until the next tag).
  if (/\[skip release\]/i.test(git("log", "-1", "--format=%s"))) {
    console.log("The latest commit asks for [skip release]. No release.");
    return output({ release: "false", version, bumped: "false" });
  }

  const changedFiles = git("diff", "--name-only", range).split("\n").filter(Boolean);
  if (!changedFiles.some((file) => RELEASE_PATHS.some((pattern) => pattern.test(file)))) {
    console.log(`Only non-release files changed since ${baseTag} (${changedFiles.join(", ") || "none"}). No release.`);
    return output({ release: "false", version, bumped: "false" });
  }

  const breaking = commits.some((c) => /^\w+(\([^)]*\))?!:/.test(c.subject) || /BREAKING[ -]CHANGE/.test(c.body));
  const feature = commits.some((c) => /^feat(\([^)]*\))?!?:/.test(c.subject));
  const level = breaking ? "major" : feature ? "minor" : "patch";
  const next = bumpVersion(version, level);

  console.log(`${commits.length} commit(s) since ${baseTag} -> ${level}: ${version} -> ${next}`);
  if (dryRun) return output({ release: "true", version: next, bumped: "true" });

  execFileSync("npm", ["version", next, "--no-git-tag-version", "--allow-same-version"], { stdio: "inherit" });

  const date = new Date().toISOString().slice(0, 10);
  const items = commits.map((c) => `- ${c.subject} (${c.hash.slice(0, 7)})`).join("\n");
  const section = `## ${next} — ${date}\n\n${items}\n`;
  const changelog = fs.existsSync("CHANGELOG.md") ? fs.readFileSync("CHANGELOG.md", "utf8") : "# Changelog\n";
  const firstSection = changelog.search(/^## /m);
  const updated =
    firstSection === -1
      ? `${changelog.trimEnd()}\n\n${section}`
      : `${changelog.slice(0, firstSection)}${section}\n${changelog.slice(firstSection)}`;
  fs.writeFileSync("CHANGELOG.md", updated);

  return output({ release: "true", version: next, bumped: "true" });
}

main();
