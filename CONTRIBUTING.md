# Contributing & Deployment Workflow

This project uses a **two-tier promotion model**: changes flow *upward* through a
`staging` site for testing and into a `production` site for live customers. Both
are hosted on Railway.

```text
feature/x  ──(merge)──▶  staging  ──(promotion PR)──▶  main
                            │                            │
                         staging site               production
```

## Branches → environments

| Branch    | Railway environment | Purpose                                               |
| --------- | ------------------- | ----------------------------------------------------- |
| `main`    | `production`        | Live customer-facing site. Protected, PR-only.        |
| `staging` | `staging`           | Integration / test line. Everything lands here first. |

- `staging` deploys to the **staging** environment on every push — work is tested
  here before it ever reaches production.
- `main` deploys to **production** and only ever receives code that has already
  been on `staging`, via a **promotion pull request** (`staging → main`).
- Each Railway environment has its **own variables and its own database**, so
  testing on staging never touches production data. (Each Mongo instance needs
  the same `GLIBC_TUNABLES=glibc.pthread.rseq=1` workaround the prod DB uses.)

## Day-to-day flow

Changes move **feature → staging → main**. `main` is protected, so production is
only ever updated through a promotion PR — never a direct push.

1. **Branch off `main`** (the last released, stable state):

   ```bash
   git checkout main && git pull
   git checkout -b feat/short-description
   ```

2. **Build it, then send it to staging to test** — merge your branch into
   `staging` and push:

   ```bash
   git checkout staging && git pull
   git merge feat/short-description
   git push            # → deploys to the staging environment
   ```

3. **Verify on the staging site.** Iterate on your feature branch and repeat
   step 2 until you're happy.

4. **Promote to production** — open a PR from `staging` into `main`:

   ```bash
   gh pr create --base main --head staging --title "Promote: <what>"
   ```

   CI (lint, typecheck, test, build) must pass, then merge it. Railway deploys
   `main` to production automatically.

5. **Re-align `staging` after promoting.** The promotion PR adds a merge commit
   to `main` that `staging` doesn't have yet, so pull it back so the two branches
   stay level (this is the one bit of bookkeeping the promotion model needs):

   ```bash
   git checkout staging && git merge --ff-only origin/main && git push
   ```

> **Promoting sends *everything* currently on `staging` to production**, not a
> single feature. So don't park half-finished work on `staging` while trying to
> promote something else — keep `staging` in a promotable state. If staging ever
> gets messy, reset it to main: `git checkout staging && git reset --hard
> origin/main && git push --force-with-lease`.

**Hotfixes:** for an urgent production fix, still route it through `staging`
(steps 1–5) — it only costs one extra push and keeps the two environments in
sync. Only bypass staging if production is actively down.

## Previewing changes — and why we don't use PR environments

Staging *is* the preview: merging a branch into `staging` (step 2 above) deploys
it to the staging site. That's the single preview mechanism for this project.

Railway offers **PR Environments** (an ephemeral environment spun up per open
PR). We have deliberately **not** enabled them:

- We already have a persistent `staging` environment, so merging to `staging`
  gives the same preview at no extra cost.
- PR environments run live infrastructure (and potentially a database) for every
  open PR — added cost and moving parts for a single-maintainer project.
- They inherit variables from a base environment, which is a credential-leak
  footgun if misconfigured.

**Revisit this if the team grows** or multiple PRs are regularly open at once —
that's when per-PR isolation starts to pay for itself. To turn them on later:
Railway → Project Settings → Environments → "PR Environments are enabled", with
the base environment set to `staging` (never `production`).

## Branch protection

`main` requires (configured in GitHub → Settings → Rules → Rulesets):

- A pull request before merging (no direct pushes) — this is the promotion PR.
- The **"Lint, typecheck, test"** status check to pass.
- Branch up to date before merging; force pushes blocked.

`staging` is intentionally left unprotected so you can push to it freely while
testing.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every PR and push
to `main` / `staging`:

```
npm run lint && npx tsc --noEmit && npm test && npm run build
```

Run the same checks locally before pushing:

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```
