# Contributing & Deployment Workflow

This project uses a **two-tier** branch + deploy model: a `staging` site for
testing and a `production` site for live customers. Both are hosted on Railway.

## Branches → environments

| Branch    | Railway environment | Purpose                                  |
| --------- | ------------------- | ---------------------------------------- |
| `main`    | `production`        | Live customer-facing site. Protected.    |
| `staging` | `staging`           | Pre-prod testing. Safe to deploy freely. |

- `main` deploys to **production** on every push (i.e. every merged PR).
- `staging` deploys to the **staging** environment on every push.
- Each Railway environment has its **own variables and its own database**, so
  testing on staging never touches production data. (Each Mongo instance needs
  the same `GLIBC_TUNABLES=glibc.pthread.rseq=1` workaround the prod DB uses.)

## Day-to-day flow

`main` is protected — **all changes reach production via a pull request**, never
a direct push.

1. **Branch off `main`:**
   ```bash
   git checkout main && git pull
   git checkout -b feat/short-description
   ```
2. **Open a PR into `main`.** CI (lint, typecheck, test, build) must pass.
3. **Test on staging before merging** (optional but recommended for anything
   user-facing). Deploy your work to the staging site by merging your branch
   into `staging`:
   ```bash
   git checkout staging && git pull
   git merge feat/short-description
   git push            # → deploys to the staging environment
   ```
   Verify on the staging URL.
4. **Merge the PR into `main`** once CI is green and you're happy with staging.
   Railway deploys it to production automatically.

`staging` is a disposable integration branch — if it drifts, you can reset it to
`main` (`git checkout staging && git reset --hard main && git push --force`).

## Previewing changes — and why we don't use PR environments

To preview a change on a live URL before it ships, **merge the branch into
`staging`** (step 3 above) and check the staging site. That's the single preview
mechanism for this project.

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

- A pull request before merging (no direct pushes).
- The **"Lint, typecheck, test"** status check to pass.
- Branch up to date before merging; force pushes blocked.

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
