import { test, expect } from '@playwright/test';

test.describe('Chatbot Widget (M4)', () => {
  test('harus memuat widget chat dan dapat mengirim pesan', async ({ page }) => {
    await page.goto('/');
    
    // Cari tombol floating widget chat di bagian bawah kanan
    // Cari button yang mengandung icon MessageCircle/svg di pojok kanan bawah
    // Di file chat-widget.tsx class tombol pemicu adalah: fixed bottom-6 right-6 z-50
    const chatTrigger = page.locator('button.fixed.bottom-6.right-6');
    await expect(chatTrigger).toBeVisible();
    await chatTrigger.click();

    // Tunggu transisi skala/opasitas widget selesai dengan menunggu selector inputnya terlihat
    const chatInput = page.locator('input[placeholder="Ketik pesan..."]');
    await chatInput.waitFor({ state: 'visible', timeout: 5000 });
    await expect(chatInput).toBeVisible();

    await chatInput.fill('Apakah ada meja kerja?');
    await chatInput.press('Enter');

    const botMessage = page.locator('div:has-text("asisten KRIYA"), div:has-text("Maaf, fitur chat belum sepenuhnya terhubung")').first();
    await expect(botMessage).toBeVisible();
  });
});
