import { expect, test } from '@playwright/test';

function relativeLuminance(color: string) {
  const channels = color.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) {
    throw new Error(`Unexpected computed color: ${color}`);
  }

  const [red, green, blue] = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string) {
  const luminances = [
    relativeLuminance(foreground),
    relativeLuminance(background)
  ].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test('creates and tracks an order through the portal', async ({ page }) => {
  const orderId = `ORD-E2E-${Date.now()}`;
  const correlationId = `corr-e2e-${Date.now()}`;
  const orderPayload = {
    order: {
      orderId,
      customerId: 'CUST-E2E-1',
      sku: 'SKU-100',
      quantity: 1,
      correlationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'created',
      timeline: [
        { stage: 'received', at: new Date().toISOString(), details: {} },
        { stage: 'inventory_reserved', at: new Date().toISOString(), details: { sku: 'SKU-100', quantity: 1 } },
        { stage: 'notification_accepted', at: new Date().toISOString(), details: {} }
      ]
    }
  };

  await page.route('**/api/health', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ service: 'api-gateway', status: 'ok' })
  }));

  await page.route('**/api/orders', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: { 'x-correlation-id': correlationId },
        body: JSON.stringify(orderPayload)
      });
      return;
    }
    await route.continue();
  });

  await page.route(`**/api/orders/${orderId}`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-correlation-id': correlationId },
        body: JSON.stringify(orderPayload)
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Order', exact: true })).toBeVisible();

  await page.getByLabel('Order ID').first().fill(orderId);
  await page.getByLabel('Customer ID').fill('CUST-E2E-1');
  await page.getByLabel('SKU').fill('SKU-100');
  await page.getByLabel('Quantity').fill('1');
  await page.locator('#create-order-form').getByRole('button', { name: 'Create order' }).click();

  await expect(page.locator('#create-status')).toHaveText('Order created successfully.');
  await expect(page.locator('#create-status')).toHaveAttribute('data-state', 'success');
  const successStatusColors = await page.locator('#create-status').evaluate((element) => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(element.parentElement!).backgroundColor
  }));
  expect(contrastRatio(successStatusColors.foreground, successStatusColors.background))
    .toBeGreaterThanOrEqual(4.5);
  await expect(page.locator('#create-result')).toContainText(orderId, { timeout: 30_000 });
  await expect(page.locator('#create-result')).toContainText('"status": "created"', { timeout: 30_000 });
  await expect(page.locator('#create-result')).toContainText('"notification_accepted"', { timeout: 30_000 });
  await expect(page.locator('#create-correlation')).not.toHaveText('Not generated yet');

  await page.getByLabel('Order ID').nth(1).fill(orderId);
  await page.getByRole('button', { name: 'Track order' }).click();

  await expect(page.locator('#track-status')).toHaveText('Order details loaded successfully.');
  await expect(page.locator('#track-status')).toHaveAttribute('data-state', 'success');
  await expect(page.locator('#track-result')).toContainText(orderId, { timeout: 30_000 });
  await expect(page.locator('#track-result')).toContainText('"status": "created"', { timeout: 30_000 });
  await expect(page.locator('#track-result')).toContainText('"inventory_reserved"', { timeout: 30_000 });
  await expect(page.locator('#track-correlation')).not.toHaveText('Not generated yet');
});

test('navigates the app shell and keeps navigation compact on mobile', async ({ page }) => {
  await page.route('**/config', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      environmentName: 'local visual test',
      buildSha: 'screenshot-only',
      apiGatewayUrl: 'Not connected',
      repoLinks: {
        portal: '#',
        gateway: '#',
        orders: '#',
        contracts: '#',
        scenarioFeature: '#',
        scenarioIncident: '#',
        scenarioRollback: '#'
      }
    })
  }));

  await page.route('**/api/health', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ service: 'api-gateway', status: 'ok' })
  }));

  await page.goto('/');
  const actionButtons = page.locator('.primary-action, form button, #refresh-health');
  for (const button of await actionButtons.all()) {
    const label = (await button.innerText()).trim();
    let colors = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { foreground: style.color, background: style.backgroundColor };
    });
    expect(contrastRatio(colors.foreground, colors.background), `${label} default contrast`)
      .toBeGreaterThanOrEqual(4.5);

    await button.hover();
    colors = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { foreground: style.color, background: style.backgroundColor };
    });
    expect(contrastRatio(colors.foreground, colors.background), `${label} hover contrast`)
      .toBeGreaterThanOrEqual(4.5);
  }

  const formInputs = page.locator('#create-order-form input, #track-order-form input');
  for (const input of await formInputs.all()) {
    const name = await input.getAttribute('name');
    const colors = await input.evaluate((element) => {
      const style = getComputedStyle(element);
      return { boundary: style.borderTopColor, surface: style.backgroundColor };
    });
    expect(contrastRatio(colors.boundary, colors.surface), `${name} control boundary contrast`)
      .toBeGreaterThanOrEqual(3);
  }

  await expect(page.getByRole('heading', { name: 'Order', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'User profile' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  const sections = [
    { label: 'Dashboard', panel: 'dashboard-view', copy: 'Dashboard metrics will appear here in a future update.' },
    { label: 'Order', panel: 'orders-view', copy: 'Create order' },
    { label: 'Listing', panel: 'listing-view', copy: 'Listing tools will appear here in a future update.' },
    { label: 'Admin', panel: 'admin-view', copy: 'Portal administration tools will appear here in a future update.' },
    { label: 'Settings', panel: 'settings-view', copy: 'Portal settings will appear here in a future update.' },
    { label: 'Community', panel: 'community-view', copy: 'Community resources will appear here in a future update.' },
    { label: 'Tutorial', panel: 'tutorial-view', copy: 'Tutorial guides will appear here in a future update.' }
  ];

  const dashboardLink = navigation.getByRole('button', { name: 'Dashboard' });
  const orderLink = navigation.getByRole('button', { name: 'Order', exact: true });
  await dashboardLink.focus();
  for (const [index, section] of sections.entries()) {
    const navLink = navigation.getByRole('button', { name: section.label, exact: true });
    await expect(navLink).toBeFocused();
    if (index < sections.length - 1) await page.keyboard.press('Tab');
  }

  await dashboardLink.focus();
  await page.keyboard.press('Tab');
  await expect(orderLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#orders-view')).toBeVisible();

  for (const section of sections) {
    const navLink = navigation.getByRole('button', { name: section.label, exact: true });
    await navLink.click();
    await expect(navLink).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.nav-link[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('#page-title')).toHaveText(section.label);
    await expect(page.locator(`#${section.panel}`)).toBeVisible();
    await expect(page.locator(`#${section.panel}`)).toContainText(section.copy);
    await page.screenshot({
      path: `test-results/sidebar-${section.label.toLowerCase()}.png`
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCSS('flex-basis', '72px');
  await expect(page.getByRole('region', { name: 'User profile' })).toBeVisible();
  await navigation.getByRole('button', { name: 'Order', exact: true }).click();
  await expect(page.locator('#orders-view')).toBeVisible();
  const mobileSidebarBox = await page.locator('.sidebar').boundingBox();
  const mobileProfileBox = await page.locator('.profile').boundingBox();
  if (!mobileSidebarBox || !mobileProfileBox) throw new Error('Mobile sidebar or profile is not rendered');
  expect(mobileSidebarBox.y).toBeCloseTo(0, 0);
  expect(mobileProfileBox.y).toBeGreaterThanOrEqual(0);
  expect(mobileProfileBox.y + mobileProfileBox.height).toBeGreaterThanOrEqual(780);
  expect(mobileProfileBox.y + mobileProfileBox.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('#page-title')).toBeInViewport();
  await page.screenshot({ path: 'test-results/sidebar-mobile-order.png' });

  await page.locator('#quick-create-order').click();
  await expect(page.getByRole('heading', { name: 'Order', exact: true })).toBeVisible();
  await expect(page.locator('#create-order-form')).toBeInViewport();

  await page.locator('#orders-view').evaluate((panel) => {
    const spacer = document.createElement('div');
    spacer.style.height = '1200px';
    spacer.setAttribute('aria-hidden', 'true');
    panel.appendChild(spacer);
  });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const sidebarBox = await page.locator('.sidebar').boundingBox();
  const profileBox = await page.locator('.profile').boundingBox();
  expect(sidebarBox?.y).toBeCloseTo(0, 0);
  expect(profileBox?.y).toBeGreaterThanOrEqual(0);
  expect(profileBox?.y + profileBox.height).toBeLessThanOrEqual(844);
});

test('shows loading, success, and error states for order and health requests', async ({ page }) => {
  let healthRequests = 0;
  await page.route('**/api/health', async route => {
    healthRequests += 1;
    await route.fulfill({
      status: healthRequests === 1 ? 200 : 503,
      contentType: 'application/json',
      body: JSON.stringify({
        message: healthRequests === 1 ? undefined : 'gateway unavailable',
        status: healthRequests === 1 ? 'ok' : undefined
      })
    });
  });

  await page.route('**/api/orders', async route => {
    if (route.request().method() === 'POST') {
      await new Promise(resolve => setTimeout(resolve, 150));
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: { 'x-correlation-id': 'corr-create-error' },
        body: JSON.stringify({ message: 'order service unavailable' })
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/orders/*', async route => {
    if (route.request().method() === 'GET') {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        headers: { 'x-correlation-id': 'corr-track-error' },
        body: JSON.stringify({ message: 'order not found' })
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await expect(page.locator('#health-result')).toContainText('"status": "ok"');

  await page.locator('#create-order-form').getByRole('button', { name: 'Create order' }).click();
  await expect(page.locator('#create-status')).toHaveText('Creating order...');
  await expect(page.locator('#create-status')).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('#create-status')).toHaveText('Order creation failed: order service unavailable');
  await expect(page.locator('#create-status')).toHaveAttribute('data-state', 'error');
  const errorStatusColors = await page.locator('#create-status').evaluate((element) => ({
    foreground: getComputedStyle(element).color,
    background: getComputedStyle(element.parentElement!).backgroundColor
  }));
  expect(contrastRatio(errorStatusColors.foreground, errorStatusColors.background))
    .toBeGreaterThanOrEqual(4.5);
  await expect(page.locator('#create-correlation')).toHaveText('corr-create-error');
  await expect(page.locator('#create-result')).toContainText('order service unavailable');

  await page.locator('#track-order-form').getByRole('button', { name: 'Track order' }).click();
  await expect(page.locator('#track-status')).toHaveText('Looking up order...');
  await expect(page.locator('#track-status')).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('#track-status')).toHaveText('Order lookup failed: order not found');
  await expect(page.locator('#track-status')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#track-correlation')).toHaveText('corr-track-error');
  await expect(page.locator('#track-result')).toContainText('order not found');

  await page.getByRole('button', { name: 'Refresh health' }).click();
  await expect(page.locator('#health-result')).toHaveText('Health check failed: gateway unavailable');
  await expect(page.locator('#health-result')).toHaveAttribute('data-state', 'error');
  const healthErrorColors = await page.locator('#health-result').evaluate((element) => {
    const style = getComputedStyle(element);
    return { foreground: style.color, background: style.backgroundColor };
  });
  expect(contrastRatio(healthErrorColors.foreground, healthErrorColors.background))
    .toBeGreaterThanOrEqual(4.5);
});
