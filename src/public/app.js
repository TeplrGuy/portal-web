async function getJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

const viewMetadata = {
  orders: {
    title: 'Orders workspace',
    subtitle:
      'Create, track, and validate order flows while the redesigned shell keeps the portal organized.'
  },
  dashboard: {
    title: 'Delivery dashboard',
    subtitle:
      'Summarize project signals, governance checkpoints, and visible proof for the demo audience.'
  },
  admin: {
    title: 'Admin placeholder',
    subtitle:
      'Reserve space for future admin workflows without expanding this issue beyond the shell and navigation foundation.'
  }
};

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function setActiveView(viewName) {
  const view = viewMetadata[viewName];
  if (!view) {
    return;
  }

  document.querySelectorAll('[data-view-target]').forEach(button => {
    const isActive = button.dataset.viewTarget === viewName;
    button.classList.toggle('active', isActive);
    if (isActive) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.hidden = panel.id !== `view-${viewName}`;
  });

  document.getElementById('page-title').textContent = view.title;
  document.getElementById('page-subtitle').textContent = view.subtitle;
  document.title = `Portal Web - ${view.title}`;
}

function renderLinks(links) {
  const grid = document.getElementById('link-grid');
  grid.innerHTML = '';

  const items = [
    ['Portal repo', links.portal],
    ['Gateway repo', links.gateway],
    ['Orders repo', links.orders],
    ['Contracts repo', links.contracts],
    ['Feature scenario issue', links.scenarioFeature],
    ['Incident scenario issue', links.scenarioIncident],
    ['Rollback scenario issue', links.scenarioRollback]
  ];

  items.forEach(([label, href]) => {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.textContent = label;
    grid.appendChild(anchor);
  });
}

async function loadConfig() {
  const { payload } = await getJson('/config');
  document.getElementById('environment-name').textContent = payload.environmentName;
  document.getElementById('build-sha').textContent = payload.buildSha;
  document.getElementById('gateway-url').textContent = payload.apiGatewayUrl;
  renderLinks(payload.repoLinks);
}

async function refreshHealth() {
  const target = document.getElementById('health-result');
  target.textContent = 'Loading health...';
  const { payload } = await getJson('/api/health');
  target.textContent = pretty(payload);
}

document.querySelectorAll('[data-view-target]').forEach(button => {
  button.addEventListener('click', () => setActiveView(button.dataset.viewTarget));
});

document.getElementById('create-order-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const body = {
    orderId: form.get('orderId'),
    customerId: form.get('customerId'),
    sku: form.get('sku'),
    quantity: Number(form.get('quantity'))
  };

  const { response, payload } = await getJson('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  document.getElementById('create-correlation').textContent =
    response.headers.get('x-correlation-id') || payload.correlationId || 'Unavailable';
  document.getElementById('create-result').textContent = pretty(payload);
});

document.getElementById('track-order-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const orderId = form.get('orderId');
  const { response, payload } = await getJson(`/api/orders/${encodeURIComponent(orderId)}`);

  document.getElementById('track-correlation').textContent =
    response.headers.get('x-correlation-id') || payload.correlationId || 'Unavailable';
  document.getElementById('track-result').textContent = pretty(payload);
});

document.getElementById('refresh-health').addEventListener('click', refreshHealth);

setActiveView('orders');
loadConfig();
refreshHealth();
