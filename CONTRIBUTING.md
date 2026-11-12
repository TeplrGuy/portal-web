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

## Policy-controlled sidebar pilot

The pilot reuses #3, #28 and #29 in one native Copilot cloud-agent PR.
Issue #8 and its white-sidebar reference supersede older dark-sidebar wording.
GH-AW triage and review are advisory; they do not assign, approve, merge or deploy.

`.github/delivery/sidebar.json` is the reviewed acceptance contract. Dispatch is
disabled by default. Keep it disabled until the quality/standards prerequisites,
required independent review and checks, and the separate review workflow are
working on main. The admission controller currently supports classic branch
protection; repositories using only rulesets fail closed until explicit support
is implemented. Do not disable or weaken rulesets to satisfy the controller.

After review, activation requires a policy PR and a dedicated
`sidebar-agent-dispatch` GitHub environment allowing only the selected branch
`main` (no tag or wildcard rules). Store `COPILOT_ASSIGNMENT_TOKEN` only as that
environment's secret, never as a repository secret. Server-side environment
restrictions, not a workflow `if` alone, protect the credential from other refs.
Use a user-to-server token with the
documented cloud-agent assignment permissions and read access to branch and
environment policy settings; installation tokens and the
Actions `GITHUB_TOKEN` are not substitutes. Never place this credential in agent
instructions, comments, logs or the agent's runtime.

Run **Sidebar delivery admission** on main with the reviewed 40-character main
SHA. It checks the triggering actor's permission (including reruns), exact revision, enforced review/checks, existing
PR references and active native cloud tasks before assigning only existing #3.
It serializes dispatches and does not retry an uncertain assignment. If it fails,
inspect the issue, native task list and run before retrying; do not remove an
assignee merely to force redispatch. Labels do not trigger this workflow.

`node --test tests/delivery/*.test.cjs` exercises the admission and scope policy.
The **Sidebar policy** workflow checks native cloud-agent PRs against the policy
from their base commit, not a policy modified by the candidate. This pilot is
limited to #3: other native cloud-agent tasks require their own approved policy
before dispatch. Include the stable scope check in the reviewed required checks
before the pilot starts.

Reviewer feedback is tied to a head SHA. Fixes must remain on the existing owned
PR and receive fresh checks/review; automatic repair is not yet enabled. Retain
the mandatory human review/merge checkpoint. Merge authorization in advance is
not independent approval of the eventual diff.

The pinned gh-aw compiler validates the two delivery workflow sources against
their committed locks in PRs. It no longer pushes generated files to main.
Regenerate both locks locally with gh-aw v1.2.2 before requesting review.

No deploy or rollback is performed by these portal workflows. The original
platform-infra setup owns the private dev release path; its current work must
settle before any live browser validation. Do not auto-close #3/#28/#29 on merge:
record the deployed revision, immutable image digest, full-stack validation and
screenshots before declaring delivery complete.

## Local checks

Run `npm ci`, `npm run lint`, `npm run test:syntax`, `npm run test:integration`,
`npm run test:e2e`, and `npm audit --audit-level=high` before requesting review.
The integration command uses Node 24's test-runner glob support without
shell-dependent expansion. `test:syntax` checks JavaScript syntax; do not report
it as behavioral unit-test coverage. `test:unit` remains an alias for it.
The browser regression mocks health and order APIs; it does not verify a live
gateway or Azure deployment.

