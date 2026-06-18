# portal-web

Frontend portal for the SDLC demo program.

## What it does

- Creates orders through `api-gateway`
- Tracks order timelines by `orderId`
- Surfaces correlation IDs and deployment metadata
- Links the runtime experience back to GitHub issues and repo evidence

## Workflow automation in this repo

- `ci.yml`: syntax checks + Playwright portal end-to-end test
- `security.yml`: dependency review and npm audit
- `issue-triage.yml`: automated issue labeling and routing hints
- `pr-review-routing.yml`: automated PR routing labels and reviewer guidance
- `azure-load-test.yml`: manual Azure Load Testing entry point for portal smoke baseline

## GitHub Agentic Workflows (gh-aw) source workflows

This repo now also includes GH-AW markdown workflows:

- `.github/workflows/ghaw-issue-triage.md`
- `.github/workflows/ghaw-pr-review.md`
- `.github/workflows/ghaw-nightly-quality.md`

These are source workflows for GitHub Agentic Workflows and should be compiled to lock files using:

```bash
gh extension install github/gh-aw
gh aw compile
```

Commit both `.md` source workflows and generated `.lock.yml` files after compilation.

## Skills lock and sync

`.github/skills/skills.lock.json` pins the version and channel of the shared engineering-skills platform consumed by this repo. It lists which skills (e.g. `pr-review`, `issue-triage`) are active and which release channel (`stable`, `canary`) and version to pull from `TeplrGuy/engineering-skills`.

Run `skills-sync.yml` (via **Actions → Sync Engineering Skills → Run workflow**) whenever you need to:

- Pull in a new skill version after the central `engineering-skills` repo has published an update.
- Add or remove a skill from the `skills` array in `skills.lock.json`.
- Recover after a manual edit to the contracts under `.github/skills/contracts/`.

The workflow runs automatically on a weekday schedule (`0 5 * * 1-5`) and opens a PR when it detects changes. Merge that PR to apply the update.

## Environment variables

- `PORT` - HTTP port (default `3000`)
- `API_GATEWAY_URL` - Base URL for the API gateway
- `ENVIRONMENT_NAME` - Environment label shown in the UI
- `BUILD_SHA` - Release/build identifier shown in the UI
- `GITHUB_OWNER` - GitHub owner for repo links

## Run locally

```bash
npm install
npm start
```
