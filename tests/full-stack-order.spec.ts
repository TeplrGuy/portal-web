import { expect, test } from '@playwright/test';

test('creates and tracks an order through all services', async ({ page, request }) => {
  test.skip(process.env.FULL_STACK_E2E !== '1', 'Run with the full-stack rehearsal');
  const inventoryUrl = process.env.INVENTORY_BASE_URL;
  const notificationsUrl = process.env.NOTIFICATIONS_BASE_URL;
  if (!inventoryUrl || !notificationsUrl) throw new Error('Full-stack service URLs are required');

  const orderId = 'ORD-PRIVATE-SENTINEL';
  const before = await (await request.get(`${inventoryUrl}/inventory/SKU-100`)).json();
  await page.goto('/');
  await page.getByLabel('Order ID').first().fill(orderId);
  await page.getByLabel('Customer ID').fill('CUST-LIVE-1');
  await page.getByLabel('SKU').fill('SKU-100');
  await page.getByLabel('Quantity').fill('1');
  await page.getByRole('button', { name: 'Create order' }).click();

  await expect(page.locator('#create-result')).toContainText('"status": "created"');
  const created = JSON.parse(await page.locator('#create-result').textContent() || '');
  const correlationId = await page.locator('#create-correlation').textContent();
  expect(correlationId).toBeTruthy();
  expect(created.order.orderId).toBe(orderId);
  expect(created.order.correlationId).toBe(correlationId);
  expect(created.order.timeline.map((item: { stage: string }) => item.stage))
    .toContain('notification_accepted');

  const inventory = await (await request.get(`${inventoryUrl}/inventory/SKU-100`)).json();
  expect(inventory.available).toBe(before.available - 1);
  const notifications = await (await request.get(`${notificationsUrl}/notifications/order/${orderId}`)).json();
  expect(notifications.count).toBe(1);
  expect(notifications.items[0].correlationId).toBe(correlationId);

  await page.getByLabel('Order ID').nth(1).fill(orderId);
  await page.getByRole('button', { name: 'Track order' }).click();
  await expect(page.locator('#track-result')).toContainText(orderId);
  const tracked = JSON.parse(await page.locator('#track-result').textContent() || '');
  expect(tracked.order.orderId).toBe(orderId);
  expect(tracked.order.correlationId).toBe(correlationId);

  const privateProbe = await request.get(`${inventoryUrl}/inventory/SKU-PRIVATE-SENTINEL?token=QUERY-PRIVATE-SENTINEL`);
  expect(privateProbe.ok()).toBeTruthy();
});
