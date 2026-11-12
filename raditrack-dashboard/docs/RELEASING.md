# Releasing RADiTrack

How code moves from a laptop to the site the hospital uses, and how we number releases.

## Environments

| Environment | Where | Deploys from | Who uses it |
|---|---|---|---|
| **Dev** | `localhost:3000` | Your working copy | Each developer |
| **Preview / staging** | Vercel preview links (one per branch and PR) | Any branch, including `main` | The team, and the client for demos of upcoming work |
| **Production** | https://raditrack.vercel.app | The `production` branch only | Hospital staff |

- `main` is the shared working branch. Merging into `main` does **not** change the live site.
- `production` holds exactly what is live. Only the release owner merges into it.
- Never push straight to `main` or `production`; always go through a pull request.

> Until we have a separate dev database, every environment uses the same Supabase data.
> Test data you load on a laptop or a preview shows up in production too. Use the RIS
> Simulator's test dataset and Restore step, and keep tests short.

## Everyday work

1. Update `main` and branch off it:
   ```bash
   git switch main
   git pull
   git switch -c feat/short-name
   ```
2. Commit your work with a [conventional commit](#commit-messages) message and push the branch.
3. Open a pull request into `main`. Vercel posts a preview link on the PR; test your change there.
4. After review, merge. `main`'s preview link now shows the combined work: that is staging.

Branch name prefixes: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`.

## Releasing to production

1. **Check staging.** Open `main`'s Vercel preview, sign in, and click through the dashboard,
   Examinations, Generate report, Configurations and the Patient TV display.
2. **Pick the version number** (see [Versions](#versions)).
3. **Open a release PR** from `main` into `production`, titled `Release v0.2.0`. In the
   description, list what changed for users (new features, fixes) in plain words.
4. **Merge it.** Vercel deploys `production` to raditrack.vercel.app in a minute or two.
5. **Tag the release** on the merged commit:
   ```bash
   git switch production
   git pull
   git tag -a v0.2.0 -m "v0.2.0"
   git push origin v0.2.0
   ```
6. **Publish release notes:** on GitHub, open Releases → Draft a new release, choose the tag,
   and paste the list from the release PR.
7. **Check production:** open raditrack.vercel.app and repeat a quick click-through.

## Versions

We use [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

| Change | Bump | Example |
|---|---|---|
| Bug fixes only | PATCH | `v0.2.0` → `v0.2.1` |
| New features, nothing removed | MINOR | `v0.2.1` → `v0.3.0` |
| Breaking change, or a formal milestone | MAJOR | `v0.9.0` → `v1.0.0` |

- We stay on `0.x` while RADiTrack is a prototype awaiting client approval.
- `v1.0.0` is the version the hospital formally accepts for real use.
- `v0.1.0` marks what was live when this process started.
- Tags never move. If a release needs a fix, make a new version instead of re-tagging.

## Hotfixes (production is broken)

1. **Roll back first if staff are blocked.** Vercel → Deployments → pick the last good
   production deployment → **Promote to Production**. This takes seconds and needs no code.
2. Branch off `production`, not `main`:
   ```bash
   git switch production
   git pull
   git switch -c fix/short-name
   ```
3. Fix, push, and open a PR into `production`. Test on its preview link, then merge.
4. Tag it as the next PATCH version (for example `v0.2.1`), as in step 5 of releasing.
5. Bring the fix back to `main` so the next release keeps it: open a PR from `production`
   into `main` and merge it.

## Commit messages

```
<type>: <what changed>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`.
For example: `fix: open report preview with a real link instead of window.open`.

## One-time setup

- [ ] Create the `production` branch from what is live now, and push it.
- [ ] Tag that commit `v0.1.0` and push the tag.
- [ ] Vercel → Project → Settings → Environments → Production → set the branch to `production`.
- [ ] GitHub → Settings → Branches: protect `main` and `production` (require a pull request).
- [ ] Later: a second Supabase project for Dev and Preview, with `DATABASE_URL`, `DIRECT_URL`
      and `SESSION_SECRET` set separately for the Production and Preview environments in Vercel.
