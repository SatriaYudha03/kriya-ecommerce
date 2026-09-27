import { test, expect } from '@playwright/test';

test.describe('Transaksi (Checkout v2)', () => {
  test('harus dapat menambahkan produk ke keranjang belanja', async ({ page }) => {
    await page.goto('/products/tamu-sofa');

    const variantSelector = page.locator('select, button[role="radio"]').first();
    if (await variantSelector.isVisible()) {
      await variantSelector.click();
    }

    const addToCartButton = page.locator('button:has-text("Tambah ke keranjang")').first();
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    await page.goto('/cart');
    await expect(page.locator('text=TAMU sofa')).toBeVisible();
  });

  test('checkout v2 harus mengarahkan guest ke login dengan next=/checkout', async ({ page }) => {
    await page.goto('/products/tamu-sofa');
    const addToCartButton = page.locator('button:has-text("Tambah ke keranjang")').first();
    await addToCartButton.click();

    await page.goto('/cart');
    const checkoutButton = page.locator('a[href="/checkout"]:has-text("Checkout")').first();
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout|\/login\?next=\/checkout/);
  });

  test('mengunjungi /checkout langsung sebagai guest diarahkan ke login (guard proxy.ts)', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/);
  });
});
