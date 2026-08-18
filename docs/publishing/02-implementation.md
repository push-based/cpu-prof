# Plan 2 — Repository setup for automated publishing

Code changes to land on branch `setup-pkg-publish`. Prerequisite:
[Plan 1](./01-credentials.md) is fully checked off — the workflows here fail on
their first run without the `release` environment, the App credentials and the
`v1.0.4` baseline tag.

The design is copied from
[`push-based/zod2nx-schema`](https://github.com/push-based/zod2nx-schema), with three
deliberate deviations called out in [Deviations](#deviations-from-the-reference).

---

## The shape

Versioning and publishing are two workflows joined by a git tag:

```
push to main
   └─> release.yml    (as pushbased-bot[bot])
         nx release --skip-publish
           ├─ derive version from conventional commits
           ├─ write CHANGELOG.md
           ├─ commit "release: {version}", tag v{version}, push
           └─ create GitHub Release
                 └─> tag push v*.*.*
                       └─> publish.yml   (OIDC, environment: release)
                             nx release publish  ->  registry.npmjs.org
```

Splitting them matters: publishing is triggered by an immutable tag, so a re-run
publishes exactly what was versioned, and a failed publish can be retried by
re-running one job rather than re-versioning.

---

## Step 1 — `.node-version` — ✅ done

[`.node-version`](../../.node-version) at the repo root:

```
24.19.0
```

Two reasons: the release workflows use `node-version-file` so the Node version lives
in one place, and Node 24 ships **npm 11.x**, which is required for npm trusted
publishing (npm ≥ 11.5.1). Node 20 ships npm 10 and the OIDC publish would fail.

`24.19.0` is the current Node 24 LTS (Krypton) and ships **npm 11.17.0**. The exact
patch matters more than it looks: Node `24.1.0` ships npm `11.3.0`, which is _below_
the 11.5.1 OIDC threshold. Pinning "Node 24" loosely is not sufficient — pin the
patch, and when bumping it, check the bundled npm:

```bash
curl -s https://nodejs.org/dist/index.json \
  | jq -r '.[] | select(.version|startswith("v24.")) | "\(.version) npm \(.npm)"' | head
```

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) now uses
`node-version-file: .node-version` instead of `node-version: 20`, so CI and the
release workflows build on the same runtime. Since the runner's bundled npm is
already ≥ 11.5.1, `publish.yml` needs **no** `npm i -g npm@latest` step.

---

## Step 2 — `nx.json` release configuration

Replace the current stub:

```jsonc
"release": {
  "version": { "preVersionCommand": "npx nx run-many -t build" }
}
```

with:

```jsonc
"release": {
  "projects": ["packages/cpu-prof"],
  "projectsRelationship": "independent",
  "releaseTag": { "pattern": "v{version}" },
  "changelog": {
    "workspaceChangelog": false,
    "projectChangelogs": { "createRelease": "github" }
  },
  "git": {
    "commit": true,
    "push": true,
    "pushRemote": "origin",
    "tag": true,
    "commitMessage": "release: {version}"
  },
  "version": {
    "conventionalCommits": true,
    "preVersionCommand": "npx nx run-many -t build",
    "versionActionsOptions": { "skipLockFileUpdate": true }
  }
}
```

Notes on the non-obvious fields:

- **`projects: ["packages/cpu-prof"]`** — not `packages/*`. See
  [Deviations](#deviations-from-the-reference).
- **`releaseTag.pattern: "v{version}"`** must match `publish.yml`'s `tags: v*.*.*`
  trigger. These two are a contract; changing one breaks the chain silently.
- **`skipLockFileUpdate: true`** avoids `nx release` rewriting
  `package-lock.json` in the release commit, which in this workspace (npm workspaces,
  `--legacy-peer-deps`) is a reliable source of churn and merge conflicts.
- **`preVersionCommand`** is kept — it guarantees `dist/` exists before publish.
- **`workspaceChangelog: false` + `createRelease` on `projectChangelogs`** — the
  reference repo puts `createRelease: "github"` on the _workspace_ changelog, but
  that combination is silently incompatible with `independent`. Nx warns
  `Workspace changelog is enabled, but you have configured an independent projects
relationship. This is not supported, so workspace changelog will be disabled` — and
  disables the GitHub Release along with it. The first dry run of this config hit
  exactly that: changelog written, **no release created**. Moving `createRelease`
  onto `projectChangelogs` fixes it; the corrected dry run shows
  `CREATE https://github.com/push-based/cpu-prof/releases/tag/v1.0.5`.

## Step 3 — `nx-release-publish` target default

Add to `targetDefaults` in `nx.json`:

```jsonc
"nx-release-publish": {
  "dependsOn": ["build"],
  "executor": "@nx/js:release-publish",
  "options": {
    "packageRoot": "{projectRoot}",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**`packageRoot` is `{projectRoot}`, not `{projectRoot}/dist`** — this differs from
the reference repo and getting it wrong publishes a broken package. See
[Deviations](#deviations-from-the-reference).

## Step 4 — package manifest

In [`packages/cpu-prof/package.json`](../../packages/cpu-prof/package.json) add:

```jsonc
"publishConfig": { "access": "public" },
"repository": {
  "type": "git",
  "url": "git+https://github.com/push-based/cpu-prof.git",
  "directory": "packages/cpu-prof"
},
"license": "MIT",
"description": "<one line — currently missing, and npm shows it on the package page>"
```

`publishConfig.access` is not optional: scoped packages default to `restricted`, and
a fresh automated publish without it fails on a paid-plan error.

Keep `"files": ["dist", "!**/*.tsbuildinfo"]` as is — combined with
`packageRoot: {projectRoot}` it is what produces the correct tarball.

---

## Step 5 — `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency:
  group: release
  cancel-in-progress: false

jobs:
  release:
    name: Version and release
    runs-on: ubuntu-latest
    environment: release
    env:
      NX_NON_NATIVE_HASHER: true
      NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
    steps:
      - name: Authenticate as "PushBased Bot" GitHub App
        uses: actions/create-github-app-token@v2
        id: app-token
        with:
          app-id: ${{ vars.GH_APP_ID }}
          private-key: ${{ secrets.GH_APP_PRIVATE_KEY }}
      - name: Fetch GitHub App's user ID
        id: get-user-id
        run: echo "user-id=$(gh api "/users/${{ steps.app-token.outputs.app-slug }}[bot]" --jq .id)" >> "$GITHUB_OUTPUT"
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
      - name: Configure Git user
        run: |
          git config --global user.name '${{ steps.app-token.outputs.app-slug }}[bot]'
          git config --global user.email '${{ steps.get-user-id.outputs.user-id }}+${{ steps.app-token.outputs.app-slug }}[bot]@users.noreply.github.com'
      - name: Clone the repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ steps.app-token.outputs.token }}
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      - name: Install dependencies
        run: npm ci --legacy-peer-deps
      - name: Version, release and generate changelog
        run: npx nx release --skip-publish
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
```

Details that are load-bearing:

- `fetch-depth: 0` — conventional-commit analysis needs full history and tags.
- `token: ${{ steps.app-token.outputs.token }}` on checkout — this is what makes the
  later `git push` use the App identity, which is what lets the pushed tag trigger
  `publish.yml`.
- `concurrency` without `cancel-in-progress` — never cancel a half-done release.
- No `permissions:` block is needed; the App token carries its own scopes.

## Step 6 — `.github/workflows/publish.yml`

```yaml
name: Publish

on:
  push:
    tags:
      - v*.*.*

concurrency:
  group: publish
  cancel-in-progress: false

# configured as trusted publisher (OIDC)
# https://docs.npmjs.com/trusted-publishers
permissions:
  contents: read
  id-token: write

env:
  NX_NON_NATIVE_HASHER: true
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}

jobs:
  publish:
    name: Publish packages
    runs-on: ubuntu-latest
    environment: release
    steps:
      - name: Clone the repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Configure Git user
        run: |
          git config user.name github-actions[bot]
          git config user.email 41898282+github-actions[bot]@users.noreply.github.com
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm
      - name: Install dependencies
        run: npm ci --legacy-peer-deps
      - name: Publish packages to npm
        run: npx nx release publish
```

`id-token: write` plus `environment: release` are the two halves npm's trusted
publisher matches against. Both must be present, and the environment name must equal
what was registered on npmjs.com in Plan 1 §C2.

## Step 7 — commit hygiene (recommended, not required)

`conventionalCommits: true` derives the bump from commit subjects. A batch of
non-conventional commits produces **no release at all** — a silent no-op that reads
like a broken pipeline. This repo's recent history is mostly conventional already, so
the cost is low:

- add `@commitlint/cli` + `@commitlint/config-conventional` and a
  `commitlint.config.js`,
- add a `pr-commitlint.yml` workflow linting PR commits (the reference repo has one),
- optionally husky's `commit-msg` hook for local feedback.

Treat this as a follow-up PR if you want the publishing change to land small.

---

## Deviations from the reference

1. **`packageRoot: "{projectRoot}"`, not `"{projectRoot}/dist"`.**
   `zod2nx-schema` builds with `@nx/js:tsc` into `dist/` and publishes that folder as
   the package root. `cpu-prof` builds with rollup
   ([`rollup.config.cjs`](../../packages/cpu-prof/rollup.config.cjs)) and its
   published `main` is `./dist/index.cjs` **relative to the project root**, with
   `files: ["dist"]` doing the filtering. Publishing `dist/` as the root here would
   ship a package whose entry points resolve to `dist/dist/…`. This matches how
   `1.0.4` was published by hand.

2. **`projectsRelationship: "independent"` and `projects` scoped to `cpu-prof`.**
   The reference uses `fixed` across `packages/*` because its packages version in
   lockstep. Here `@push-based/cpu-prof` is at `1.0.4` (live on npm) while
   `@push-based/nx-perf` is at `0.0.1` and has never been published; `packages/tmp`
   and `packages/prof-dev-kit` are not publishable at all (the latter has no
   `package.json`). `fixed` would drag `nx-perf` to `1.0.5`. Ship `cpu-prof` first;
   widen `release.projects` to include `nx-perf` once it has been published once by
   hand and has its own trusted-publisher entry (Plan 1 §C4).

3. **`npm ci --legacy-peer-deps`.**
   This workspace's dependency graph requires it — `ci.yml` already uses it. The
   reference gets away with plain `npm ci`.

---

## Verification before merging — ✅ run

Local dry runs — none of these write anything:

```bash
# what version would be computed, what the changelog would say
npx nx release --dry-run

# what would be published, from which folder
npx nx release publish --dry-run

# what actually ends up in the tarball
npx nx build cpu-prof
cd packages/cpu-prof && npm pack --dry-run
```

Results of the run on this branch:

- **computed version `1.0.5`** — a patch bump, from the single `fix(lint):` commit
  that touches `packages/cpu-prof`. GitHub Release preview and tag `v1.0.5` both
  appear, so the `releaseTag.pattern` ↔ `publish.yml` trigger contract holds.
- **publish target resolves correctly** — `nx run cpu-prof:nx-release-publish`,
  registry `https://registry.npmjs.org/`, and it correctly refuses with
  `Skipped … as v1.0.4 has already been published`.
- **tarball is 103 files / 34.6 kB**, containing `package.json`, `README.md`,
  `dist/index.esm.js`, `dist/index.d.ts`, `dist/cpu-prof.esm.js`. No `src/`, no
  `mocks/`, no `*.tsbuildinfo`.

> **Counting note.** An earlier estimate in Plan 1 predicted `1.1.0` by counting
> conventional commits since `v1.0.4` across the whole repo (1 `feat`, 2 `fix`). That
> over-counts: Nx scopes conventional-commit analysis to **commits touching the
> released project's files**, so workspace-wide commits and commits to other packages
> do not bump `cpu-prof`. `1.0.5` is correct. When sanity-checking a computed version,
> filter by path: `git log v1.0.4..main -- packages/cpu-prof`.

### ⚠️ Pre-existing defect found by `npm pack` — decide before releasing

The manifest declares a CommonJS entry that **does not exist in the build output**:

```jsonc
"main": "./dist/index.cjs",
"exports": { ".": { "require": "./dist/index.cjs", "default": "./dist/index.cjs" } }
```

`npx nx build cpu-prof` emits only ESM — `dist/index.esm.js`, `dist/cpu-prof.esm.js`,
`dist/reduce-trace.esm.js`. There is no `index.cjs`, so `require('@push-based/cpu-prof')`
fails for consumers. This is **not** caused by anything in this plan: unpacking the
live `1.0.4` tarball shows the same gap (and its types were worse — it shipped
`index.esm.d.ts` while the manifest pointed at `index.d.ts`).

Automating releases means shipping this repeatedly, so pick one before merging:

1. **Drop the CJS claim** (smallest, honest): remove `main`, and the `require`/`default`
   conditions, leaving the package ESM-only — which it already is (`"type": "module"`).
2. **Actually emit CJS**: configure rollup for dual output, so the existing manifest
   becomes true.

Option 1 matches reality today; option 2 is only worth it if CJS consumers matter.
Either way it is a package-API decision, deliberately left out of this plan's scope.

The repo also has a Verdaccio setup (`.verdaccio/config.yml`, `local-registry`
target) — a full end-to-end rehearsal against the local registry is possible if you
want proof before touching npm:

```bash
npx nx local-registry            # in one terminal
npm publish --registry http://localhost:4873 --workspace @push-based/cpu-prof
```

## Rollout

1. Merge this branch to `main`.
2. `release.yml` runs on the merge commit. Expect a `release: 1.0.5`-style commit
   from `pushbased-bot[bot]`, a `v1.0.5` tag, and a GitHub Release.
3. The tag push triggers `publish.yml`. Expect a new version on
   <https://www.npmjs.com/package/@push-based/cpu-prof> with provenance attached
   (trusted publishing adds a provenance attestation automatically).
4. If `publish.yml` fails, fix and **re-run the job** — do not re-tag. The version is
   already committed; re-running publishes the same tag's contents.

## Failure modes and what they look like

| Symptom                                       | Cause                                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `release.yml` succeeds, no `publish.yml` run  | Tag pushed with `GITHUB_TOKEN` instead of the App token, or `releaseTag.pattern` no longer matches `v*.*.*` |
| npm publish: `401` / `unable to authenticate` | npm < 11.5.1 on the runner (Step 1), or trusted publisher fields mismatched (Plan 1 §C2)                    |
| npm publish: `402 payment required`           | Missing `publishConfig.access: "public"` (Step 4)                                                           |
| Package installs but imports fail             | `packageRoot` set to `dist` (Deviation 1)                                                                   |
| "No changes were detected" / no release       | Commits since the last tag are not conventional, or none of them touch `packages/cpu-prof` (Step 7)         |
| Version jumps to something absurd             | Missing `v1.0.4` baseline tag (Plan 1 §E)                                                                   |
| Changelog written but no GitHub Release       | `createRelease` sitting on `workspaceChangelog` while `projectsRelationship` is `independent` (Step 2)      |
| `require()` of the package fails              | Pre-existing missing `dist/index.cjs` — see the defect note above, not a pipeline fault                     |
