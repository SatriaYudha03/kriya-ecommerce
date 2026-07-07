import { test, expect } from '@playwright/test';

test.describe('Katalog (M1)', () => {
  test('harus memuat halaman utama dan menampilkan hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header a:has-text("KRIYA")')).toBeVisible();
    await expect(page.locator('text=Ruang kerja').first()).toBeVisible();
  });

  test('harus dapat menjelajahi kategori produk', async ({ page }) => {
    await page.goto('/');
    const categoryLink = page.locator('a[href*="/kategori/living-room"]').first();
    await expect(categoryLink).toBeVisible();
    await categoryLink.click();
    await page.waitForURL(/\/kategori\/living-room/);
    await expect(page).toHaveURL(/\/kategori\/living-room/);
    await expect(page.locator('h1')).toContainText(/Ruang keluarga/i);
  });

  test('harus menampilkan halaman detail produk dengan benar', async ({ page }) => {
    await page.goto('/kategori/living-room');
    const productCard = page.locator('a[href*="/produk/tamu-sofa"]').first();
    await expect(productCard).toBeVisible();
    await productCard.click();
    await page.waitForURL(/\/produk\/tamu-sofa/);
    await expect(page).toHaveURL(/\/produk\/tamu-sofa/);
    await expect(page.locator('h1')).toContainText('TAMU sofa');
    await expect(page.locator('text=Dimensi & material')).toBeVisible();
  });

  test('harus dapat memuat gambar produk dari storage Supabase', async ({ page }) => {
    await page.goto('/produk/tamu-sofa');
    
    // Cari elemen gambar produk di halaman PDP
    const productImage = page.locator('img[src*="supabase.co/storage"], img[src*="_next/image?url=https%3A%2F%2Fnmlhpeqpahihfwzbqmzp.supabase.co"]').first();
    await expect(productImage).toBeVisible();
  });
});
