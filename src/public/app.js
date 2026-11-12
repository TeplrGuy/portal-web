async function getJson(url, options) {
  const response = await fetch(url, options);
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The server returned an invalid JSON response (HTTP ${response.status}).`);
  }
  return { response, payload };
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function responseErrorMessage(payload, response) {
  const message = payload?.message || payload?.error;
  return typeof message === 'string' ? message : `HTTP ${response.status}`;
}

function requestErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

const navigationItems = Array.from(document.querySelectorAll('.nav-link'));
const viewPanels = Array.from(document.querySelectorAll('[data-view-panel]'));

function setActiveView(viewName) {
  const selectedItem = navigationItems.find((item) => item.dataset.view === viewName);
  if (!selectedItem) return false;

  navigationItems.forEach((item) => {
    const isActive = item === selectedItem;
    item.classList.toggle('is-active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  viewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.viewPanel !== viewName;
  });

  document.getElementById('page-title').textContent = selectedItem.dataset.title;
  document.title = `Portal Web | ${selectedItem.dataset.title}`;
  return true;
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
  target.dataset.state = 'loading';
  target.textContent = 'Loading health...';
  try {
    const { response, payload } = await getJson('/api/health');
    if (!response.ok) {
      target.dataset.state = 'error';
      target.textContent = `Health check failed: ${responseErrorMessage(payload, response)}`;
      return;
    }

    target.dataset.state = 'success';
    target.textContent = pretty(payload);
  } catch (error) {
    target.dataset.state = 'error';
    target.textContent = `Health check failed: ${requestErrorMessage(error)}`;
  }
}

navigationItems.forEach((item) => {
  item.addEventListener('click', () => setActiveView(item.dataset.view));
});

document.getElementById('quick-create-order').addEventListener('click', () => {
  setActiveView('orders');
  document.getElementById('create-order-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('create-order-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('create-status');
  status.dataset.state = 'loading';
  status.textContent = 'Creating order...';

  const form = new FormData(event.currentTarget);
  const body = {
    orderId: form.get('orderId'),
    customerId: form.get('customerId'),
    sku: form.get('sku'),
    quantity: Number(form.get('quantity'))
  };

  try {
    const { response, payload } = await getJson('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    document.getElementById('create-correlation').textContent =
      response.headers.get('x-correlation-id') || payload?.correlationId || 'Unavailable';
    document.getElementById('create-result').textContent = pretty(payload);
    if (!response.ok) {
      status.dataset.state = 'error';
      status.textContent = `Order creation failed: ${responseErrorMessage(payload, response)}`;
      return;
    }

    status.dataset.state = 'success';
    status.textContent = 'Order created successfully.';
  } catch (error) {
    document.getElementById('create-correlation').textContent = 'Unavailable';
    document.getElementById('create-result').textContent =
      'No order was created. Check your connection and try again.';
    status.dataset.state = 'error';
    status.textContent = `Order creation failed: ${requestErrorMessage(error)}`;
  }
});

document.getElementById('track-order-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('track-status');
  status.dataset.state = 'loading';
  status.textContent = 'Looking up order...';

  const form = new FormData(event.currentTarget);
  const orderId = form.get('orderId');
  try {
    const { response, payload } = await getJson(`/api/orders/${encodeURIComponent(orderId)}`);

    document.getElementById('track-correlation').textContent =
      response.headers.get('x-correlation-id') || payload?.correlationId || 'Unavailable';
    document.getElementById('track-result').textContent = pretty(payload);
    if (!response.ok) {
      status.dataset.state = 'error';
      status.textContent = `Order lookup failed: ${responseErrorMessage(payload, response)}`;
      return;
    }

    status.dataset.state = 'success';
    status.textContent = 'Order details loaded successfully.';
  } catch (error) {
    document.getElementById('track-correlation').textContent = 'Unavailable';
    document.getElementById('track-result').textContent =
      'Order details could not be loaded. Check your connection and try again.';
    status.dataset.state = 'error';
    status.textContent = `Order lookup failed: ${requestErrorMessage(error)}`;
  }
});

document.getElementById('refresh-health').addEventListener('click', refreshHealth);

loadConfig();
refreshHealth();
