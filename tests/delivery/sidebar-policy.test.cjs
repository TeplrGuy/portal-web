const { test } = require('node:test');
const assert = require('node:assert/strict');
const source = require('../../.github/delivery/sidebar.json');
const { validateAdmission, validateFiles, validatePolicy } = require('../../scripts/sidebar-policy.cjs');
const { main } = require('../../scripts/dispatch-sidebar.cjs');

const sha = 'a'.repeat(40);
function fixture() {
  const policy = structuredClone(source);
  policy.enabled = true;
  return {
    policy,
    snapshot: {
      repository: policy.repository,
      ref: 'refs/heads/main',
      baseSha: sha,
      requestedSha: sha,
      actorPermission: 'admin',
      issue: { number: 3, state: 'open', assignees: [] },
      openPullRequests: [],
      activeTasks: [],
      reviewWorkflowState: 'active',
      dispatchEnvironment: { deployment_branch_policy: { custom_branch_policies: true, protected_branches: false } },
      dispatchBranches: [{ name: 'main', type: 'branch' }],
      protection: {
        enforce_admins: { enabled: true },
        required_pull_request_reviews: { required_approving_review_count: 1, dismiss_stale_reviews: true },
        required_status_checks: { strict: true, contexts: policy.requiredCandidateChecks }
      },
      checks: policy.requiredChecks.map(name => ({
        name, head_sha: sha, app: { slug: 'github-actions' }, status: 'completed', conclusion: 'success'
      }))
    }
  };
}

test('admits only a reviewed protected baseline with explicit activation', () => {
  const { policy, snapshot } = fixture();
  assert.doesNotThrow(() => validateAdmission(policy, snapshot));
  assert.throws(() => validateAdmission(source, snapshot), /disabled/);
});

test('rejects unauthorized targets, actors and stale base revisions', () => {
  for (const change of [
    { repository: 'attacker/portal-web' }, { ref: 'refs/heads/feature' },
    { actorPermission: 'write' }, { requestedSha: 'b'.repeat(40) }, { requestedSha: '' }
  ]) {
    const { policy, snapshot } = fixture();
    assert.throws(() => validateAdmission(policy, { ...snapshot, ...change }));
  }
});

test('does not redispatch an assigned, closed or already implemented issue', () => {
  for (const change of [
    { issue: { number: 3, state: 'closed', assignees: [] } },
    { issue: { number: 3, state: 'open', assignees: [{ login: 'copilot-swe-agent[bot]' }] } },
    { openPullRequests: [{ number: 100 }] },
    { activeTasks: [{ state: 'waiting_for_user' }] }
  ]) {
    const { policy, snapshot } = fixture();
    assert.throws(() => validateAdmission(policy, { ...snapshot, ...change }));
  }
});

test('requires enforced independent review, required checks and a working reviewer', () => {
  const cases = [
    snapshot => { snapshot.protection.required_pull_request_reviews.required_approving_review_count = 0; },
    snapshot => { snapshot.protection.required_pull_request_reviews.dismiss_stale_reviews = false; },
    snapshot => { snapshot.protection.enforce_admins.enabled = false; },
    snapshot => { snapshot.protection.required_status_checks.contexts = []; },
    snapshot => { snapshot.protection.required_status_checks.strict = false; },
    snapshot => { snapshot.reviewWorkflowState = 'disabled_manually'; }
  ];
  for (const mutate of cases) {
    const { policy, snapshot } = fixture();
    mutate(snapshot);
    assert.throws(() => validateAdmission(policy, snapshot));
  }
});

test('rejects missing, duplicate, stale, forged, skipped and failed check evidence', () => {
  for (const mutate of [
    checks => { checks.pop(); },
    checks => { checks.push(checks[0]); },
    checks => { checks[0].head_sha = 'b'.repeat(40); },
    checks => { checks[0].app.slug = 'untrusted-app'; },
    checks => { checks[0].conclusion = 'skipped'; },
    checks => { checks[0].conclusion = 'failure'; },
    checks => { checks[0].status = 'in_progress'; }
  ]) {
    const { policy, snapshot } = fixture();
    mutate(snapshot.checks);
    assert.throws(() => validateAdmission(policy, snapshot), /baseline check/);
  }
});

test('requires server-side credential restrictions, not just a workflow branch condition', () => {
  for (const change of [
    { dispatchEnvironment: {} },
    { dispatchBranches: [] },
    { dispatchBranches: [{ name: '*', type: 'branch' }] },
    { dispatchBranches: [{ name: 'main', type: 'tag' }] },
    { dispatchBranches: [{ name: 'main', type: 'branch' }, { name: 'feature', type: 'branch' }] }
  ]) {
    const { policy, snapshot } = fixture();
    assert.throws(() => validateAdmission(policy, { ...snapshot, ...change }), /credential environment/);
  }
});

test('permits sidebar assets and focused tests, including deletion of in-scope files', () => {
  assert.doesNotThrow(() => validateFiles(source, [
    { filename: 'src/public/styles.css', status: 'modified' },
    { filename: 'tests/portal-sidebar.spec.ts', status: 'added' },
    { filename: 'tests/integration/sidebar.test.js', status: 'added' }
  ]));
});

test('blocks policy tampering, traversal and out-of-scope rename sources', () => {
  for (const file of [
    { filename: '.github/workflows/ci.yml' },
    { filename: 'package.json' },
    { filename: 'src/server.js' },
    { filename: 'tests/../package.json' },
    { filename: 'tests\\sidebar.spec.ts' },
    { filename: 'tests/visual-baselines/sidebar.spec.ts' },
    { filename: 'tests/sidebar.spec.ts', previous_filename: '.github/CODEOWNERS' }
  ]) {
    assert.throws(() => validateFiles(source, [file]), /Out-of-scope/);
  }
  assert.throws(() => validateFiles(source, []), /required/);
});

test('malformed policy fails closed', () => {
  for (const change of [
    { version: 2 }, { enabled: 'true' }, { requiredChecks: [] },
    { allowedFiles: ['**/*'] }, { acceptance: [] }, { issue: 28 }
  ]) {
    assert.throws(() => validatePolicy({ ...source, ...change }));
  }
});

function dispatchFixture() {
  const { policy, snapshot } = fixture();
  const calls = [];
  const root = `/repos/${policy.repository}`;
  const responses = {
    [`${root}/branches/main`]: { commit: { sha } },
    [`${root}/issues/3`]: snapshot.issue,
    [`${root}/issues/3/timeline?per_page=100&page=1`]: [],
    [`${root}/pulls?state=open&per_page=100&page=1`]: [],
    [`/agents/repos/${policy.repository}/tasks?per_page=100&page=1`]: { tasks: [] },
    [`${root}/branches/main/protection`]: snapshot.protection,
    [`${root}/collaborators/maintainer/permission`]: { permission: 'admin' },
    [`${root}/actions/workflows/${policy.reviewWorkflow}`]: { state: 'active' },
    [`${root}/environments/${policy.dispatchEnvironment}`]: snapshot.dispatchEnvironment,
    [`${root}/environments/${policy.dispatchEnvironment}/deployment-branch-policies?per_page=100&page=1`]:
      { branch_policies: snapshot.dispatchBranches },
    [`${root}/commits/${sha}/check-runs?filter=latest&per_page=100&page=1`]: { check_runs: snapshot.checks },
    [`${root}/issues/3/assignees`]: { assignees: [{ login: 'copilot-swe-agent[bot]' }] }
  };
  const env = {
    COPILOT_ASSIGNMENT_TOKEN: 'test-token-not-a-credential',
    GITHUB_ACTOR: 'maintainer',
    GITHUB_TRIGGERING_ACTOR: 'maintainer',
    GITHUB_REPOSITORY: policy.repository,
    GITHUB_REF: 'refs/heads/main',
    EXPECTED_BASE_SHA: sha
  };
  const request = async (url, options) => {
    const path = url.replace('https://api.github.com', '');
    calls.push({ path, ...options });
    assert.ok(Object.hasOwn(responses, path), `Unexpected API request: ${path}`);
    return { ok: true, json: async () => responses[path] };
  };
  return { policy, env, request, responses, calls };
}

test('dispatch uses the native assignment endpoint once and preserves the existing assignee set', async () => {
  const data = dispatchFixture();
  await main(data);
  const writes = data.calls.filter(call => call.method === 'POST');
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, '/repos/TeplrGuy/portal-web/issues/3/assignees');
  const body = JSON.parse(writes[0].body);
  assert.equal(body.agent_assignment.base_branch, 'main');
  assert.match(body.agent_assignment.custom_instructions, /#28 then #29/);
  assert.match(body.agent_assignment.custom_instructions, /white sidebar/);
  assert.match(body.agent_assignment.custom_instructions, /Never merge/);
});

test('disabled policy and missing user credential make no API calls', async () => {
  const data = dispatchFixture();
  await assert.rejects(() => main({ ...data, policy: source }), /disabled/);
  await assert.rejects(() => main({ ...data, env: { ...data.env, COPILOT_ASSIGNMENT_TOKEN: '' } }), /Missing user/);
  assert.equal(data.calls.length, 0);
});

test('API failure is explicit, never retried, and cannot produce success', async () => {
  const data = dispatchFixture();
  let calls = 0;
  const request = async () => {
    calls++;
    return { ok: false, status: 403 };
  };
  await assert.rejects(() => main({ ...data, request }), /HTTP 403/);
  assert.equal(calls, 1);
});

test('reruns authorize the triggering actor, not the original dispatcher', async () => {
  const data = dispatchFixture();
  data.env.GITHUB_TRIGGERING_ACTOR = 'contributor';
  data.responses['/repos/TeplrGuy/portal-web/collaborators/contributor/permission'] = { permission: 'write' };
  await assert.rejects(() => main(data), /requires a maintainer/);
  assert.equal(data.calls.filter(call => call.method === 'POST').length, 0);
});

test('ownership changes during admission prevent assignment', async () => {
  const data = dispatchFixture();
  let issueReads = 0;
  const request = async (url, options) => {
    if (url.endsWith('/issues/3') && ++issueReads === 2) {
      return { ok: true, json: async () => ({
        ...data.responses['/repos/TeplrGuy/portal-web/issues/3'],
        assignees: [{ login: 'copilot-swe-agent[bot]' }]
      }) };
    }
    return data.request(url, options);
  };
  await assert.rejects(() => main({ ...data, request }), /ownership or base SHA changed/);
  assert.equal(data.calls.filter(call => call.method === 'POST').length, 0);
});

test('unconfirmed assignment is reported as uncertain without retrying', async () => {
  const data = dispatchFixture();
  data.responses['/repos/TeplrGuy/portal-web/issues/3/assignees'] = { assignees: [] };
  await assert.rejects(() => main(data), /did not confirm Copilot ownership/);
  assert.equal(data.calls.filter(call => call.method === 'POST').length, 1);
});
