const bot = 'copilot-swe-agent[bot]';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validatePolicy(policy) {
  assert(policy.version === 1, 'Unsupported policy version');
  assert(typeof policy.enabled === 'boolean', 'Policy must explicitly enable or disable dispatch');
  assert(policy.repository === 'TeplrGuy/portal-web' && policy.issue === 3 &&
    policy.baseBranch === 'main' && policy.designIssue === 8, 'Unexpected delivery target');
  assert(policy.dispatchEnvironment === 'sidebar-agent-dispatch', 'Unexpected credential environment');
  assert(JSON.stringify(policy.childIssues) === '[28,29]', 'Unexpected child issue sequence');
  assert(Array.isArray(policy.requiredChecks) && policy.requiredChecks.length > 0 &&
    policy.requiredChecks.every(name => typeof name === 'string' && name.length > 0) &&
    new Set(policy.requiredChecks).size === policy.requiredChecks.length, 'Required checks must be explicit and unique');
  assert(Array.isArray(policy.requiredCandidateChecks) &&
    [...policy.requiredChecks, 'dependency-review', 'policy-tests', 'trusted-sidebar-scope']
      .every(name => policy.requiredCandidateChecks.includes(name)) &&
    !policy.requiredCandidateChecks.includes('sidebar-scope'), 'Missing required trusted candidate gates');
  assert(policy.reviewWorkflow === 'ghaw-pr-review.lock.yml', 'Unexpected review workflow');
  assert(Array.isArray(policy.allowedFiles) && policy.allowedFiles.length === 3 &&
    ['src/public/index.html', 'src/public/styles.css', 'src/public/app.js']
      .every(path => policy.allowedFiles.includes(path)), 'Unexpected writable production files');
  assert(Array.isArray(policy.acceptance) && policy.acceptance.length > 0 &&
    policy.acceptance.every(item => typeof item === 'string' && item.trim()), 'Missing acceptance criteria');
}

function validateAdmission(policy, snapshot) {
  validatePolicy(policy);
  assert(policy.enabled, 'Sidebar dispatch is disabled pending prerequisite review and activation');
  assert(snapshot.repository === policy.repository &&
    snapshot.ref === `refs/heads/${policy.baseBranch}`, 'Dispatch must use the trusted default branch');
  assert(/^[a-f0-9]{40}$/.test(snapshot.requestedSha) &&
    snapshot.requestedSha === snapshot.baseSha, 'The authorized base SHA is stale or invalid');
  assert(['admin', 'maintain'].includes(snapshot.actorPermission), 'Dispatch requires a maintainer');
  assert(snapshot.issue.number === policy.issue && snapshot.issue.state === 'open', 'Target issue is not open');
  assert(!snapshot.issue.assignees.some(actor => actor.login === bot), 'Copilot already owns this issue; do not redispatch');
  assert(snapshot.openPullRequests.length === 0, 'An open PR already references this issue; reconcile ownership first');
  assert(snapshot.activeTasks.length === 0, 'An active cloud task exists; reconcile ownership first');
  const protection = snapshot.protection;
  assert(protection.required_pull_request_reviews?.required_approving_review_count >= 1 &&
    protection.required_pull_request_reviews.dismiss_stale_reviews === true &&
    protection.enforce_admins?.enabled === true, 'Enforced independent review and stale-review dismissal are required');
  const contexts = [
    ...(protection.required_status_checks?.contexts || []),
    ...(protection.required_status_checks?.checks || []).map(check => check.context)
  ];
  assert(protection.required_status_checks?.strict === true &&
    policy.requiredCandidateChecks.every(name => contexts.includes(name)), 'Required status checks are not enforced');
  assert(snapshot.reviewWorkflowState === 'active', 'Separate review workflow is not active');
  assert(snapshot.dispatchEnvironment.deployment_branch_policy?.custom_branch_policies === true &&
    snapshot.dispatchEnvironment.deployment_branch_policy.protected_branches === false &&
    snapshot.dispatchBranches.length === 1 &&
    snapshot.dispatchBranches[0].name === policy.baseBranch &&
    snapshot.dispatchBranches[0].type === 'branch', 'Dispatch credential environment must allow only the main branch');
  for (const name of policy.requiredChecks) {
    const checks = snapshot.checks.filter(check => check.name === name);
    assert(checks.length === 1 && checks[0].head_sha === snapshot.baseSha &&
      checks[0].app?.slug === 'github-actions' &&
      checks[0].status === 'completed' && checks[0].conclusion === 'success',
    `Missing, stale, ambiguous or unsuccessful baseline check: ${name}`);
  }
}

function validateFiles(policy, files) {
  validatePolicy(policy);
  assert(Array.isArray(files) && files.length > 0, 'Changed files are required');
  function allowed(path) {
    return typeof path === 'string' && !path.includes('\\') &&
      !path.split('/').some(part => part === '..' || part === '.' || part === '') &&
      (policy.allowedFiles.includes(path) ||
        /^tests\/integration\/[^/]+\.test\.js$/.test(path) ||
        /^tests\/[^/]+\.spec\.ts$/.test(path));
  }
  for (const file of files) {
    assert(allowed(file.filename) && (!file.previous_filename || allowed(file.previous_filename)),
      `Out-of-scope change: ${file.previous_filename ? `${file.previous_filename} -> ` : ''}${file.filename}`);
  }
}

module.exports = { bot, validatePolicy, validateAdmission, validateFiles };
