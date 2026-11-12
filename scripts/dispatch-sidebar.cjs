const fs = require('node:fs');
const { bot, validateAdmission, validatePolicy } = require('./sidebar-policy.cjs');

async function main({
  policy = JSON.parse(fs.readFileSync('.github/delivery/sidebar.json', 'utf8')),
  env = process.env,
  request = fetch
} = {}) {
  validatePolicy(policy);
  if (!policy.enabled) throw new Error('Sidebar dispatch is disabled pending prerequisite review and activation');
  const token = env.COPILOT_ASSIGNMENT_TOKEN;
  if (!token) throw new Error('Missing user-to-server COPILOT_ASSIGNMENT_TOKEN; no installation-token fallback is supported');
  const actor = env.GITHUB_TRIGGERING_ACTOR;
  if (!actor || !/^[a-zA-Z0-9-]+$/.test(actor)) throw new Error('Invalid dispatch actor');
  const root = `/repos/${policy.repository}`;
  async function api(path, method = 'GET', body) {
    const response = await request(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`GitHub ${method} ${path} failed with HTTP ${response.status}; inspect the request before retrying`);
    return response.json();
  }
  async function pages(path, key) {
    const result = [];
    for (let page = 1; page <= 10; page++) {
      const data = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      const values = key ? data[key] : data;
      if (!Array.isArray(values)) throw new Error(`Unexpected paginated response: ${path}`);
      result.push(...values);
      if (values.length < 100) return result;
    }
    throw new Error(`Pagination limit reached for ${path}; reconcile manually`);
  }
  const branch = await api(`${root}/branches/${policy.baseBranch}`);
  const issue = await api(`${root}/issues/${policy.issue}`);
  const events = await pages(`${root}/issues/${policy.issue}/timeline`);
  const referencedPrs = new Set(events
    .filter(event => event.event === 'cross-referenced' && event.source?.issue?.pull_request)
    .map(event => event.source.issue.number));
  const openPullRequests = (await pages(`${root}/pulls?state=open`))
    .filter(pr => referencedPrs.has(pr.number));
  const tasks = await pages(`/agents/repos/${policy.repository}/tasks`, 'tasks');
  const activeTasks = tasks.filter(task =>
    !['completed', 'failed', 'timed_out', 'cancelled'].includes(task.state));
  const protection = await api(`${root}/branches/${policy.baseBranch}/protection`);
  const permission = await api(`${root}/collaborators/${actor}/permission`);
  const review = await api(`${root}/actions/workflows/${policy.reviewWorkflow}`);
  const dispatchEnvironment = await api(`${root}/environments/${policy.dispatchEnvironment}`);
  const dispatchBranches = await pages(`${root}/environments/${policy.dispatchEnvironment}/deployment-branch-policies`, 'branch_policies');
  const checks = await pages(`${root}/commits/${branch.commit.sha}/check-runs?filter=latest`, 'check_runs');
  validateAdmission(policy, {
    repository: env.GITHUB_REPOSITORY,
    ref: env.GITHUB_REF,
    requestedSha: env.EXPECTED_BASE_SHA,
    baseSha: branch.commit.sha,
    issue, openPullRequests, activeTasks, protection, checks, dispatchEnvironment, dispatchBranches,
    actorPermission: permission.role_name || permission.permission,
    reviewWorkflowState: review.state
  });
  const currentBranch = await api(`${root}/branches/${policy.baseBranch}`);
  const currentIssue = await api(`${root}/issues/${policy.issue}`);
  if (currentBranch.commit.sha !== branch.commit.sha ||
    currentIssue.state !== 'open' || currentIssue.assignees.some(assignee => assignee.login === bot)) {
    throw new Error('Issue ownership or base SHA changed during admission; no assignment made');
  }
  const assigned = await api(`${root}/issues/${policy.issue}/assignees`, 'POST', {
    assignees: [bot],
    agent_assignment: {
      target_repo: policy.repository,
      base_branch: policy.baseBranch,
      custom_instructions: [
        `Policy-controlled pilot v${policy.version}. Authorized base SHA: ${branch.commit.sha}.`,
        'Verify the initial checkout matches the authorized SHA before editing; stop if main has advanced.',
        'Work only on existing #3, with #28 then #29 sequentially in one PR.',
        ...policy.acceptance
      ].join('\n')
    }
  });
  if (!assigned.assignees?.some(assignee => assignee.login === bot)) {
    throw new Error('Assignment response did not confirm Copilot ownership; inspect the issue before any retry');
  }
  return `Assigned existing ${policy.repository}#${policy.issue} at authorized base ${branch.commit.sha}; merge and deployment remain gated.`;
}

if (require.main === module) {
  main().then(message => console.log(message)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { main };
