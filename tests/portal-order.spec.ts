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
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();

  await page.getByLabel('Order ID').first().fill(orderId);
  await page.getByLabel('Customer ID').fill('CUST-E2E-1');
  await page.getByLabel('SKU').fill('SKU-100');
  await page.getByLabel('Quantity').fill('1');
  await page.locator('#create-order-form').getByRole('button', { name: 'Create order' }).click();

  await expect(page.locator('#create-result')).toContainText(orderId, { timeout: 30_000 });
  await expect(page.locator('#create-result')).toContainText('"status": "created"', { timeout: 30_000 });
  await expect(page.locator('#create-result')).toContainText('"notification_accepted"', { timeout: 30_000 });
  await expect(page.locator('#create-correlation')).not.toHaveText('Not generated yet');

  await page.getByLabel('Order ID').nth(1).fill(orderId);
  await page.getByRole('button', { name: 'Track order' }).click();

  await expect(page.locator('#track-result')).toContainText(orderId, { timeout: 30_000 });
  await expect(page.locator('#track-result')).toContainText('"status": "created"', { timeout: 30_000 });
  await expect(page.locator('#track-result')).toContainText('"inventory_reserved"', { timeout: 30_000 });
  await expect(page.locator('#track-correlation')).not.toHaveText('Not generated yet');
});

test('navigates the app shell and keeps navigation compact on mobile', async ({ page }) => {
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

  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'User profile' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.getByText('Dashboard metrics will appear here in a future update.')).toBeVisible();

  await page.getByRole('button', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();
  await expect(page.getByText('Portal administration tools will appear here in a future update.')).toBeVisible();

  await page.locator('#quick-create-order').click();
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  await expect(page.locator('#orders-view')).toBeVisible();
  await page.screenshot({ path: 'test-results/issue-3-sidebar-shell.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCSS('flex-basis', '72px');
  await expect(page.getByRole('region', { name: 'User profile' })).toBeVisible();

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
