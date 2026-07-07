import { test, expect } from '@playwright/test';

test.describe('Transaksi (M2)', () => {
  test('harus dapat menambahkan produk ke keranjang belanja', async ({ page }) => {
    await page.goto('/produk/tamu-sofa');
    
    const variantSelector = page.locator('select, button[role="radio"]').first();
    if (await variantSelector.isVisible()) {
      await variantSelector.click();
    }
    
    const addToCartButton = page.locator('button:has-text("Keranjang"), button:has-text("Tambah ke Keranjang")').first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();
    
    await page.goto('/cart');
    await expect(page.locator('text=TAMU sofa')).toBeVisible();
  });

  test('harus dapat melakukan proses checkout (guest/member)', async ({ page }) => {
    await page.goto('/produk/tamu-sofa');
    const addToCartButton = page.locator('button:has-text("Keranjang"), button:has-text("Tambah ke Keranjang")').first();
    await addToCartButton.click();
    
    await page.goto('/cart');
    const checkoutButton = page.locator('a[href="/checkout"], button:has-text("Checkout")').first();
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    await expect(page).toHaveURL(/\/checkout|\/login/);
  });
});
