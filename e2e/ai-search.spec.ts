import { test, expect } from '@playwright/test';

test.describe('AI Search & Similar Products (M3)', () => {
  test('harus dapat melakukan pencarian produk pintar (semantic/keyword)', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="Cari furniture"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('meja');
    await searchInput.press('Enter');
    
    await page.waitForURL(/\/cari\?q=/);
    await expect(page).toHaveURL(/\/cari\?q=/);
    await expect(page.locator('h1')).toContainText(/Hasil pencarian/i);
  });

  test('harus memuat produk serupa di halaman detail produk (PDP)', async ({ page }) => {
    await page.goto('/produk/tamu-sofa');
    const similarProductsHeading = page.locator('text=Mungkin Kamu Suka').first();
    await expect(similarProductsHeading).toBeVisible();
  });
});
