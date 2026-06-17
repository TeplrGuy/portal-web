---
on:
  schedule: daily

permissions:
  contents: read
  actions: read
  issues: read
  pull-requests: read

engine: copilot
tracker-id: portal-ghaw-nightly-quality-v1
max-ai-credits: 3

safe-outputs:
  create-issue:
    title-prefix: "[nightly-quality] "
    labels: [automation, quality-report]
    close-older-issues: true
---

# Nightly Portal Quality Reporter

Create a concise nightly quality issue for `portal-web`.

Include:
1. CI and security run outcomes in the last 24 hours.
2. Playwright pass/fail signal and trends.
3. New issues/PRs that increase delivery risk.
4. Recommended next 3 actions for maintainers.

Style:
- Keep tone factual and short.
- Prefer bullet points and direct links to evidence.
