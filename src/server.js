const express = require('express');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const apiGatewayUrl =
  process.env.API_GATEWAY_URL ||
  'https://agtsdlc-devne-apigw.ambitiousmoss-50e2d95d.northeurope.azurecontainerapps.io';
const environmentName = process.env.ENVIRONMENT_NAME || 'local';
const buildSha = process.env.BUILD_SHA || 'local-dev';
const githubOwner = process.env.GITHUB_OWNER || 'TeplrGuy';

const repoLinks = {
  portal: `https://github.com/${githubOwner}/portal-web`,
  gateway: `https://github.com/${githubOwner}/api-gateway`,
  orders: `https://github.com/${githubOwner}/orders-service`,
  contracts: `https://github.com/${githubOwner}/shared-contracts`,
  scenarioFeature: `https://github.com/${githubOwner}/orders-service/issues/3`,
  scenarioIncident: `https://github.com/${githubOwner}/api-gateway/issues/2`,
  scenarioRollback: `https://github.com/${githubOwner}/platform-infra/issues/3`
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function correlationIdFrom(req) {
  return req.header('x-correlation-id') || randomUUID();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

app.get('/health', (_req, res) => {
  res.status(200).json({
    service: 'portal-web',
    status: 'ok',
    environment: environmentName,
    buildSha
  });
});

app.get('/config', (_req, res) => {
  res.status(200).json({
    environmentName,
    buildSha,
    apiGatewayUrl,
    repoLinks
  });
});

app.get('/api/health', async (_req, res) => {
  const { response, payload } = await fetchJson(`${apiGatewayUrl}/health`);
  return res.status(response.status).json(payload);
});

app.post('/api/orders', async (req, res) => {
  const correlationId = correlationIdFrom(req);
  const { response, payload } = await fetchJson(`${apiGatewayUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-correlation-id': correlationId
    },
    body: JSON.stringify(req.body || {})
  });

  res.setHeader('x-correlation-id', response.headers.get('x-correlation-id') || correlationId);
  return res.status(response.status).json(payload);
});

app.get('/api/orders/:orderId', async (req, res) => {
  const correlationId = correlationIdFrom(req);
  const { response, payload } = await fetchJson(
    `${apiGatewayUrl}/api/orders/${encodeURIComponent(req.params.orderId)}`,
    {
      headers: {
        'x-correlation-id': correlationId
      }
    }
  );

  res.setHeader('x-correlation-id', response.headers.get('x-correlation-id') || correlationId);
  return res.status(response.status).json(payload);
});

app.listen(port, () => {
  console.log(`portal-web listening on port ${port}`);
});
