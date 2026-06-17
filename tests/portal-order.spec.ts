import { expect, test } from '@playwright/test';

test('creates and tracks an order through the portal', async ({ page }) => {
  const orderId = `ORD-E2E-${Date.now()}`;

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Portal Web' })).toBeVisible();

  await page.getByLabel('Order ID').first().fill(orderId);
  await page.getByLabel('Customer ID').fill('CUST-E2E-1');
  await page.getByLabel('SKU').fill('SKU-100');
  await page.getByLabel('Quantity').fill('1');
  await page.getByRole('button', { name: 'Create order' }).click();

  await expect(page.locator('#create-result')).toContainText(orderId);
  await expect(page.locator('#create-result')).toContainText('"status": "created"');
  await expect(page.locator('#create-result')).toContainText('"notification_accepted"');
  await expect(page.locator('#create-correlation')).not.toHaveText('Not generated yet');

  await page.getByLabel('Order ID').nth(1).fill(orderId);
  await page.getByRole('button', { name: 'Track order' }).click();

  await expect(page.locator('#track-result')).toContainText(orderId);
  await expect(page.locator('#track-result')).toContainText('"status": "created"');
  await expect(page.locator('#track-result')).toContainText('"inventory_reserved"');
  await expect(page.locator('#track-correlation')).not.toHaveText('Not generated yet');
});
