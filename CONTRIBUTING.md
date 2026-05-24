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
