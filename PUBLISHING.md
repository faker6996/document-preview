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

## Releasing (automatic on push to `main`)

Every push to `main` runs `.github/workflows/publish-package.yml`: install, typecheck, tests, build, then
`scripts/auto-release.mjs` decides whether to release.

| Changes since the last tag `vX.Y.Z` | Result |
|---|---|
| Only tests, `.github/`, `scripts/`, config files | No release |
| `src/`, `package.json`, `package-lock.json` or `README.md` | Release |
| A commit `type!:` or with `BREAKING CHANGE` in its body | **major** (minor while the version is `0.x`) |
| A commit `feat:` / `feat(scope):` | **minor** |
| Anything else (`fix:`, free-form messages, …) | **patch** |
| `[skip release]` in the subject of the latest pushed commit | No release |
| `package.json` version not on npm yet (manual bump or `npm run release`) | That version is published as is |

When it releases, CI:

1. bumps `package.json` / `package-lock.json` and prepends a `CHANGELOG.md` section built from the commit subjects;
2. commits `chore(release): @underverse-ui/document-preview@X.Y.Z [skip ci]` to `main` and pushes the tag `vX.Y.Z`
   (if `main` moved meanwhile, the push fails and nothing is published; the next push releases);
3. publishes with npm Trusted Publishing (OIDC): `latest` for stable versions, the prerelease identifier
   (`beta`, `rc`, …) as dist-tag otherwise. The repository is public, so npm adds a provenance attestation;
4. creates a GitHub Release with generated notes.

Preview the decision locally: `node scripts/auto-release.mjs --dry-run`.

Pull after a release (`git pull`) to get the release commit before continuing.

### Choosing the version yourself

- Write commit messages with [Conventional Commits](https://www.conventionalcommits.org) prefixes (`feat:`, `fix:`, `feat!:`).
- Or bump manually: `npm run release` / `release:minor` / `release:major` / `release:beta` (add `-- --push`).
  The pushed version is not on npm yet, so CI publishes exactly that version.

### Requirements

- workflow permissions `contents: write` and `id-token: write` (declared in the workflow);
- an npm Trusted Publisher on the package: repository `faker6996/document-preview`, workflow `publish-package.yml`,
  **Allow `npm publish` enabled** (otherwise npm only stages the release and you must approve it on npmjs.com);
- the workflow pushes its release commit to `main` with `GITHUB_TOKEN`: if you protect `main`, allow
  GitHub Actions to bypass the rule, or the release commit is rejected.

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
   and create the GitHub Release (`gh release create v0.1.0 --generate-notes`). Done for `0.1.0`.

## Existing versions

Published npm versions are never overwritten or unpublished. Check the latest one with:

```bash
npm view @underverse-ui/document-preview version
```
