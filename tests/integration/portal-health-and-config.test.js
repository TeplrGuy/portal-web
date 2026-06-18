const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await wait(150);
  }
  throw new Error("portal-web did not become healthy in time");
}

test("portal-web health and config endpoints return deterministic payload", async () => {
  const port = String(4200 + Math.floor(Math.random() * 200));
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn("node", ["src/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port,
      ENVIRONMENT_NAME: "ci-test",
      BUILD_SHA: "test-sha",
      API_GATEWAY_URL: "http://127.0.0.1:65534"
    },
    stdio: "ignore"
  });

  try {
    await waitForHealth(baseUrl);

    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    const healthJson = await health.json();
    assert.equal(healthJson.service, "portal-web");
    assert.equal(healthJson.environment, "ci-test");

    const config = await fetch(`${baseUrl}/config`);
    assert.equal(config.status, 200);
    const cfg = await config.json();
    assert.equal(cfg.environmentName, "ci-test");
    assert.equal(cfg.buildSha, "test-sha");
    assert.ok(cfg.repoLinks.portal.includes("portal-web"));
  } finally {
    child.kill("SIGTERM");
  }
});
