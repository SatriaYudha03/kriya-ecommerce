import { test, expect } from '@playwright/test';

test.describe('Halaman Admin & Auth Guard (M6)', () => {
  test('harus memuat halaman admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('text=Total Pesanan')).toBeVisible();
    await expect(page.locator('text=KRIYA Admin')).toBeVisible();
  });

  test('harus memuat halaman pesanan admin', async ({ page }) => {
    await page.goto('/admin/pesanan');
    await expect(page.locator('aside')).toBeVisible();
  });

  test('harus memuat halaman produk admin', async ({ page }) => {
    await page.goto('/admin/produk');
    await expect(page.locator('aside')).toBeVisible();
  });
});
