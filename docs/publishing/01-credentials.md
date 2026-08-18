# Plan 1 — Credentials & access for automated publishing

Everything in this document requires **human action outside the repo** (GitHub org
settings, npmjs.com, local npm login). None of it can be done from a PR. Do all of
it _before_ merging the workflow changes from [Plan 2](./02-implementation.md),
otherwise the first run of `release.yml` fails on `main`.

Model repo: [`push-based/zod2nx-schema`](https://github.com/push-based/zod2nx-schema)
— the values below were read back from its live configuration, so this mirrors a
setup that is known to work.

---

## What the pipeline actually needs

Two workflows need two different identities, for two different reasons:

| Workflow                                                | Needs                         | Why                                                                                                                                                                                      |
| ------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `release.yml` (versions, commits, tags, GitHub Release) | GitHub App installation token | Pushes a commit + tag to `main`. The default `GITHUB_TOKEN` **cannot** be used: pushes made with it do not trigger other workflows, so the `v*.*.*` tag would never start `publish.yml`. |
| `publish.yml` (publishes to npm)                        | npm Trusted Publisher (OIDC)  | No long-lived `NPM_TOKEN` to store or rotate. GitHub mints a short-lived OIDC token; npm verifies it came from this repo + workflow + environment.                                       |

---

## A. GitHub App — "PushBased Bot"

The org already owns the App; it does **not** need to be created again.

| Fact                | Value                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| App name            | PushBased Bot                                                                |
| Slug                | `pushbased-bot`                                                              |
| **App ID**          | **`2781189`**                                                                |
| Owner               | `push-based`                                                                 |
| Permissions         | `contents: write`, `pull_requests: write`, `metadata: read`                  |
| Bot commit identity | `pushbased-bot[bot] <258902310+pushbased-bot[bot]@users.noreply.github.com>` |

Those permissions are exactly what `nx release` needs (commit + tag + push, create
release). Nothing has to change on the App itself.

### A1. Install the App on this repository — _org owner_

<https://github.com/organizations/push-based/settings/installations> → PushBased Bot
→ Configure → add `push-based/cpu-prof` to the selected repositories.

Verify afterwards: the repo appears under the App's repository access list.

### A2. Obtain the private key — _org owner_

`GH_APP_PRIVATE_KEY` is the App's PEM private key. If the original `.pem` from when
the App was created is no longer at hand, generate a fresh one:

App settings → Private keys → **Generate a private key** → downloads a `.pem`.

Generating a new key does not invalidate the existing one, so `zod2nx-schema` keeps
working. Keep the file out of any repo and delete it locally once stored as a secret.

> The value is the **entire** file including the `-----BEGIN RSA PRIVATE KEY-----`
> and `-----END RSA PRIVATE KEY-----` lines and the trailing newline.

---

## B. GitHub repository configuration — _repo admin_

`push-based/cpu-prof` currently has a single environment (`copilot`), no repo
variables and no repo secrets. The reference repo stores everything at
**environment** scope, in an environment named `release` with **no protection rules
and no branch policy**. Mirror that.

### B1. Create the `release` environment

Settings → Environments → **New environment** → name it exactly `release`.

Leave required reviewers, wait timer and deployment branch policy **off**. (Adding a
required reviewer is a legitimate choice if you want a manual gate before anything
reaches npm — it will pause both workflows. Decide deliberately; the reference repo
does not use one.)

### B2. Add the environment variable

| Name        | Scope                             | Value     |
| ----------- | --------------------------------- | --------- |
| `GH_APP_ID` | Environment `release` → Variables | `2781189` |

### B3. Add the environment secret

| Name                 | Scope                           | Value                          |
| -------------------- | ------------------------------- | ------------------------------ |
| `GH_APP_PRIVATE_KEY` | Environment `release` → Secrets | contents of the `.pem` from A2 |

### B4. Optional — Nx Cloud

Both workflows reference `secrets.NX_CLOUD_ACCESS_TOKEN`. In the reference repo this
secret is **not** defined, and the workflows still pass — an undefined secret
resolves to an empty string and Nx falls back to local caching. This repo has
`nxCloudId: 67f4ed637b16f351e65d5530` in `nx.json`.

Add the secret only if you want release builds to share the Nx Cloud cache. Get it
from the Nx Cloud workspace settings; store as a repo secret (not environment), so
`ci.yml` can use it too.

### B5. Verify

```bash
gh api repos/push-based/cpu-prof/environments --jq '.environments[].name'
gh api repos/push-based/cpu-prof/environments/release/variables --jq '.variables[].name'
gh api repos/push-based/cpu-prof/environments/release/secrets   --jq '.secrets[].name'
```

Expected: `release` present; variables contain `GH_APP_ID`; secrets contain
`GH_APP_PRIVATE_KEY`. (Secret _values_ are never readable back — that is expected.)

---

## C. npm Trusted Publisher — _npm package owner / `@push-based` org admin_

`@push-based/cpu-prof` already exists on npm at version `1.0.4`, so this is a
configuration change on an existing package, not a first publish.

### C1. Confirm who owns it

Locally you are currently **not authenticated** (`npm whoami` → 401). Log in first:

```bash
npm login
npm whoami
npm access list collaborators @push-based/cpu-prof
```

You need write/admin access on the package to configure a trusted publisher. If the
account that published `1.0.4` is a personal one rather than the `@push-based` org,
sort that out here — this is the most likely place for this plan to stall.

### C2. Configure the trusted publisher

npmjs.com → `@push-based/cpu-prof` → **Settings** → **Trusted Publisher** → GitHub
Actions, with exactly:

| Field               | Value         |
| ------------------- | ------------- |
| Organization / user | `push-based`  |
| Repository          | `cpu-prof`    |
| Workflow filename   | `publish.yml` |
| Environment         | `release`     |

All four must match the workflow from Plan 2 character-for-character, including the
environment name — OIDC verification fails closed on any mismatch.

### C3. Decide on the 2FA / publish policy

Under the package's publishing access settings, `Require two-factor authentication`
blocks automation. Trusted publishing is the sanctioned way around it — confirm the
package is set to allow it (npm surfaces this as "Require two-factor authentication
or automation tokens" vs. a stricter mode). If your org enforces a stricter policy,
that has to be relaxed for the package or the OIDC publish is rejected.

### C4. Repeat per package, later

Each npm package needs its own trusted-publisher entry. `@push-based/nx-perf`
(currently `0.0.1`, never published) is **out of scope for the first release** — see
Plan 2. When it is ready, it needs: an initial manual publish (a trusted publisher
cannot create a package that does not exist yet, unless you use the "publish new
package" flow at org level), then its own trusted-publisher config.

---

## D. npm CLI version — the easiest thing to get wrong

OIDC / trusted publishing requires **npm ≥ 11.5.1** on the runner.

Resolved in Plan 2 §1: `.node-version` pins **24.19.0** (Node 24 LTS, npm 11.17.0)
and CI now reads that file instead of hardcoding Node 20. No action needed here —
listed because a version shortfall _presents_ as an auth failure, not as a version
error, and is otherwise a long detour to diagnose.

Watch the patch level when bumping Node: `24.1.0` ships npm `11.3.0`, still below the
threshold. "Node 24" alone is not enough.

---

## E. Git tag baseline — _anyone with push access_

`nx release` with `conventionalCommits: true` computes the next version from the
commits since the last matching tag. **This repo has no tags at all.** Without a
baseline, the first automated run scans the entire history and produces a wrong
version.

Version `1.0.4` was set in commit `39a0b81` (`chore: bump version`), which matches
what is on npm. Tag that commit:

```bash
git tag v1.0.4 39a0b81
git push origin v1.0.4
```

> Do this **after** `publish.yml` exists on `main`? No — do it **before**. The
> workflow triggers on tag _push_; pushing `v1.0.4` while `publish.yml` is not yet on
> the default branch is the safe ordering, and avoids an accidental republish of a
> version that already exists on npm.

---

## Checklist

Status as of the automated run of this plan (2026-08-19):

- [x] A1 — PushBased Bot installed on `push-based/cpu-prof` (installation `107555215`,
      `contents: write`) — verified by minting an App JWT
- [x] A2 — App private key `.pem` provided
- [x] B1 — `release` environment created, no protection rules, no branch policy
- [x] B2 — `GH_APP_ID` = `2781189` as environment variable
- [x] B3 — `GH_APP_PRIVATE_KEY` as environment secret
- [ ] B4 — (optional) `NX_CLOUD_ACCESS_TOKEN` repo secret — _see note below_
- [x] B5 — verified via `gh api`
- [ ] **C1 — npm login confirmed, ownership of `@push-based/cpu-prof` confirmed** ⛔ _needs interactive npm login_
- [ ] **C2 — trusted publisher configured** ⛔ _npmjs.com web UI only_
- [ ] **C3 — package publish policy allows trusted publishing** ⛔ _npmjs.com web UI only_
- [x] E — `v1.0.4` tag pushed, pointing at `39a0b81` (the commit that set `1.0.4`)

### What was found while running this

**A1 was already satisfied** — the initial "blocked" reading was a false alarm caused
by an OAuth scope limit, not by a missing installation. `gh` cannot list an App's
repositories with an OAuth token, so installation status was unknowable from the CLI.
With the private key in hand it is directly verifiable by minting an App JWT:

```bash
# JWT signed RS256 with the .pem, iss = app id 2781189
curl -H "Authorization: Bearer $JWT" https://api.github.com/repos/push-based/cpu-prof/installation
```

Result: installation **`107555215`**, permissions `contents: write`,
`pull_requests: write`, `metadata: read` — exactly what `nx release` needs to commit,
tag, push and create a release. The same JWT against `/app` returns
`slug=pushbased-bot id=2781189`, which also proves the stored key belongs to the App
whose id is in `GH_APP_ID`. Those two facts together are the real precondition for
`release.yml`; check them this way rather than by eyeballing the settings page.

**Handle the `.pem` after use.** It was supplied at
`tmp/pushbased-bot.2026-08-18.private-key.pem`. `tmp/` is gitignored
(`.gitignore:5`), so it cannot be committed by accident — but it is an unencrypted
org-wide App credential sitting in a working directory. Delete it once the secret is
stored; GitHub can always issue a new one.

**B4 — the Nx Cloud workspace looks unclaimed.** Local Nx runs return
`401 … This workspace is more than three days old and is not connected. Workspaces
must be connected within 3 days of creation` for `nxCloudId`
`67f4ed637b16f351e65d5530` (set in `nx.json`). Adding `NX_CLOUD_ACCESS_TOKEN` will
not help until the workspace is claimed at <https://cloud.nx.app>, or the
`nxCloudId` is removed from `nx.json`. Neither blocks releasing — Nx falls back to
local caching.

**E — what the baseline implies for the first release.** There are **23 commits**
between `v1.0.4` and `main`: 1 `feat`, 2 `fix`, 0 breaking. So the first automated
run should compute **`1.1.0`** (a `feat` outranks the `fix`es). If a dry run in Plan 2
reports anything else, stop and investigate before merging.

Once every box is ticked, Plan 2's workflows can be merged to `main`.
