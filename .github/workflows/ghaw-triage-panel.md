---
description: Triage panel — classify issues, scope analysis, owner model recommendation
on:
  issues:
    types: [opened, edited, reopened, labeled]
permissions:
  contents: read
  issues: read
  pull-requests: read
tracker-id: portal-triage-panel-v1
max-ai-credits: 3
safe-outputs:
  add-comment:
    max: 1
  create-issue:
    title-prefix: "[portal-split] "
    labels: [automation, triage-generated]
    max: 2
---

# Portal Triage Panel

Act as a triage panel for incoming issues.

For each issue:
1. Classify type (bug/enhancement/incident/question).
2. Determine scope (portal-only or cross-service).
3. Recommend owner model:
   - single local owner
   - local owner + delegated cloud-agent slice
4. List required quality gates for this issue (CI/security/Playwright/load test as needed).

Output:
- One concise triage comment following this structure:
  - Triage result
  - Scope
  - Owner model
  - Required gates
  - Evidence expected at PR time

If scope is clearly split-able, create up to two follow-up task issues.