# Publishing `@underverse-ui/document-preview`

`@underverse-ui/document-preview` is a public scoped npm package (MIT) in the `@underverse-ui` npm organization,
published to npmjs.com with `publishConfig.access=public`. It follows the same release process as
`@underverse-ui/underverse`.

## Local checks

```bash
npm ci
npm run check                      # typecheck + tests + build
npm pack --dry-run --ignore-scripts
```

## Releasing

Only CI publishes. Nobody runs `npm publish` from a laptop (except the one-time bootstrap below), and pushes
to `main` never publish.

1. Merge the changes to `main` and wait for the **Repository Quality** workflow to pass.
2. Update `CHANGELOG.md` on `main`.
3. From an up-to-date, clean `main`, prepare the release:

   ```bash
   npm run release          # patch: 0.1.0 -> 0.1.1
   npm run release:minor    # 0.1.0 -> 0.2.0
   npm run release:major    # 0.1.0 -> 1.0.0
   npm run release:beta     # 0.1.0 -> 0.1.1-beta.0 (npm dist-tag "beta")
   ```

   The script bumps `package.json` / `package-lock.json`, commits
   `chore(release): @underverse-ui/document-preview@X.Y.Z` and creates the tag `vX.Y.Z`.
   It refuses to run on another branch, with uncommitted changes, or when `main` differs from `origin/main`.
4. Push the commit and tag together (or pass `-- --push` to the script):

   ```bash
   git push --atomic origin main vX.Y.Z
   ```

To abandon a prepared release before pushing: `git tag -d vX.Y.Z && git reset --hard HEAD~1`.

## GitHub Actions

`.github/workflows/publish-package.yml` runs only when a `v*.*.*` tag is pushed. It:

- fails unless the tag equals `v` + the package version, the tagged commit is on `main`, and that version is not on npm yet;
- runs `npm run check` and inspects the package contents;
- publishes with npm Trusted Publishing (OIDC): `latest` for stable versions, the prerelease identifier
  (`beta`, `rc`, …) as dist-tag otherwise. The repository is public, so npm adds a provenance attestation;
- creates a GitHub Release with generated notes (marked prerelease for prerelease versions).

Requirements:

- workflow permissions `contents: write` and `id-token: write` (already declared);
- an npm Trusted Publisher on the package for repository `faker6996/document-preview`, workflow
  `publish-package.yml` (keep the filename);
- recommended: protect `main` (require the quality check) and add a tag protection rule for `v*`.

## One-time bootstrap (first version only)

npm only lets you configure a Trusted Publisher on a package that already exists. For the very first version:

1. Log in as a member of the `@underverse-ui` org with publish rights: `npm login`.
2. From a clean `main` at the version in `package.json` (`0.1.0`):

   ```bash
   npm ci && npm run check
   npm publish --access public
   ```

3. On npmjs.com → package **Settings** → **Trusted Publisher** → GitHub Actions: repository
   `faker6996/document-preview`, workflow `publish-package.yml`.
4. Optionally set **Publishing access** to "Require two-factor authentication and disallow tokens" so only CI
   can publish from then on.
5. Tag the bootstrapped commit so history matches npm: `git tag -a v0.1.0 -m "Release v0.1.0" && git push origin v0.1.0`
   — the publish workflow will stop safely because `0.1.0` is already on npm, and you can create the GitHub
   Release manually (`gh release create v0.1.0 --generate-notes`).

## Existing versions

Published npm versions are never overwritten or unpublished. Check the latest one with:

```bash
npm view @underverse-ui/document-preview version
```
