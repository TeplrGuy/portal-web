# Contributing

## Execution model

1. One issue has one primary owner.
2. One branch has one implementation owner (local or delegated).
3. Review responsibilities stay separate from implementation.
4. For parallel work, split by file/module boundaries.

## One-file-one-agent rule

- Do not have multiple agents edit the same file in the same wave.
- Define ownership per file set before implementation starts.
- If overlap appears, stop and re-plan the wave split.

## Required quality gates

- CI green (includes Playwright)
- Security workflow green
- Functional validation evidence
- Human PR review complete

## PR expectations

Use the repository PR template and include evidence links for:
- tests,
- workflow runs,
- risk/rollback decisions.

## Local checks

Run `npm ci`, `npm run lint`, `npm run test:syntax`, `npm run test:integration`,
`npm run test:e2e`, and `npm audit --audit-level=high` before requesting review.
The integration command uses Node 24's test-runner glob support without
shell-dependent expansion. `test:syntax` checks JavaScript syntax; do not report
it as behavioral unit-test coverage. `test:unit` remains an alias for it.
The browser regression mocks health and order APIs; it does not verify a live
gateway or Azure deployment.

