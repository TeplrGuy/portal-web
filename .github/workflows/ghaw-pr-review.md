---
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read

engine: copilot
tracker-id: portal-ghaw-pr-review-v1
max-ai-credits: 3

safe-outputs:
  add-comment:
    max: 1
---

# Portal Pull Request Review Assistant

Analyze the pull request as a reviewer assistant and provide one high-signal summary comment.

Focus areas:
1. Scope classification:
   - app/UI change
   - workflow/platform change
   - mixed change
2. Risk analysis:
   - runtime risk
   - automation/workflow risk
   - cross-service blast radius
3. Validation coverage:
   - CI, security, Playwright
   - whether load test should be required for this change
4. Session safety:
   - confirm branch ownership is clear and implementation/review responsibilities are separated.

Response format:
- `Review route`
- `Risk level` (low/medium/high) with one-sentence rationale
- `Required before merge` checklist
- `Post-merge follow-up` (if any)

Constraints:
- Keep the comment concise and actionable.
- Do not request broad or unrelated refactors.
