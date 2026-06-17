import { expect, test } from '@playwright/test';

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
  await expect(page.getByRole('heading', { name: 'Portal Web' })).toBeVisible();

  await page.getByLabel('Order ID').first().fill(orderId);
  await page.getByLabel('Customer ID').fill('CUST-E2E-1');
  await page.getByLabel('SKU').fill('SKU-100');
  await page.getByLabel('Quantity').fill('1');
  await page.getByRole('button', { name: 'Create order' }).click();

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
