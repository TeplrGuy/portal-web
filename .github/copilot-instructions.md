# Copilot Instructions for portal-web

This repository is the product-facing web experience in the SDLC demo. It is a lightweight Node/Express app that serves static UI assets and proxies browser-safe requests to `api-gateway`.

## Load order
1. Read `.github/instructions/global-engineering-standards.md`.
2. If the task changes UI, static assets, browser behavior, or the portal proxy layer, also read `.github/instructions/frontend-rules.md` when present.
3. Read the GitHub issue body and follow its task-specific constraints.

## Mandatory skill bootstrap (cloud and local)
1. Read `.github/skills/skills.lock.json`.
2. Read `.github/skills/skills-manifest.json`.
3. Load at least one relevant skill contract before implementation:
   - Issue shaping/triage: `.github/skills/issue-triage/v1/SKILL.md`
   - PR analysis/review: `.github/skills/pr-review/v1/SKILL.md`
   - Test strategy: `.github/skills/test-plan/v1/SKILL.md`
   - Contract or response-shape impact: `.github/skills/contract-impact/v1/SKILL.md`
   - Incident handling: `.github/skills/incident-response/v1/SKILL.md`
4. Follow the active skill output contract (`summary`, `evidence`, `risk`, `actions`) when posting issue/PR conclusions.
5. If required skill files are missing, stop and call out the gap instead of improvising.
6. Token discipline:
   - Read minimally: issue/PR body, changed files, and referenced constraints first.
   - Do not paste long logs/files; link them and summarize in bullets.
   - Keep working summaries concise and evidence-first.

## Repo intent
- Keep this repo focused on the customer-facing demo journey.
- Prefer small, traceable changes tied to one issue.
- Preserve the cross-repo story: portal -> gateway -> orders-service -> shared-contracts.

## Architecture guardrails
- `src/server.js` is the server entrypoint and proxy layer.
- Static assets live under `src/public`.
- Do not bypass `api-gateway` to call downstream services directly from the UI.
- Keep correlation IDs flowing through requests and responses.
- Preserve environment-driven configuration (`API_GATEWAY_URL`, `ENVIRONMENT_NAME`, `BUILD_SHA`, `GITHUB_OWNER`).

## Demo guardrails
- UI changes must keep the demo easy to narrate for non-technical audiences.
- Show repo and issue traceability where the experience already supports it.
- If a UI issue is completed, attach a resulting screenshot back to the GitHub issue.

## Safety boundaries
- Do not rename repos, services, or the demo storyline without explicit approval.
- Do not remove GitHub workflow files unless the issue explicitly requires it.
- Escalate instead of guessing when a change would alter the demo flow across repos.

## APM-aligned operations
- Apply `.github/instructions/apm-aligned-agent-ops.md` for deterministic context loading and cost governance.
- Keep issue/PR outputs concise and evidence-first.
- Respect workflow safe-output limits and `max-ai-credits` guardrails.