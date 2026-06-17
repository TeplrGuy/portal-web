# Copilot Instructions for portal-web

This repository is the product-facing web experience in the SDLC demo. It is a lightweight Node/Express app that serves static UI assets and proxies browser-safe requests to `api-gateway`.

## Load order
1. Read `.github/instructions/global-engineering-standards.md`.
2. If the task changes UI, static assets, browser behavior, or the portal proxy layer, also read `.github/instructions/frontend-rules.md` when present.
3. Read the GitHub issue body and follow its task-specific constraints.

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
