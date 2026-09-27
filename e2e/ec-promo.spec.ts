import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const WEB_URL = process.env.WEB_URL || 'http://localhost:3003';
const API_URL = process.env.API_URL || 'http://localhost:8083';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmlhpeqpahihfwzbqmzp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhwZXFwYWhpaGZ3emJxbXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMDQzMDMsImV4cCI6MjA5ODg4MDMwM30.FqOKqRDepp7B7h-ktivvB-uvMTQitvY-ZgjQaVPVeXk';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhwZXFwYWhpaGZ3emJxbXpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMwNDMwMywiZXhwIjoyMDk4ODgwMzAzfQ.JB3UXTwMTeIL3y_6G2F_5HA2zKnG-AUQ2BGND_nPcy4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

let adminJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZW1haWwiOiJhZG1pbkBrcml5YS5jb20iLCJleHAiOjE3OTMwNjY0MDYsImlhdCI6MTc5MDQ3NDQwNiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJkZmRjZDVjOC0zNDAzLTQxZmMtOTIwYy01Mzc3YTMyY2E5MDcifQ.75qI5LfyXObRL89HjzCpF32Z16XSnsdraplyUTmlfds';
let adminUserId = 'dfdcd5c8-3403-41fc-920c-5377a32ca907';
let variantId = 'c50aaa4d-9167-4fb1-906f-44f0db71b3cd';

test.beforeAll(async () => {
  // Fix products with null weight_kg to prevent checkout bug
  await supabaseAdmin.from('products').update({ weight_kg: 10 }).is('weight_kg', null);

  // Insert dummy order for test
  await supabaseAdmin.from('orders').upsert({
    id: '00000000-0000-0000-0000-000000000001',
    user_id: adminUserId,
    order_number: 'DUMMY1',
    status: 'pending',
    subtotal: 0,
    total: 0
  }, { onConflict: 'id' });

  // Cleanup old test data
  await supabaseAdmin.from('coupon_redemptions').delete().eq('order_id', '00000000-0000-0000-0000-000000000001');
  await supabaseAdmin.from('coupons').delete().like('code', 'ECC-%');
});

test.afterAll(async () => {
  await supabaseAdmin.from('coupon_redemptions').delete().eq('order_id', '00000000-0000-0000-0000-000000000001');
  await supabaseAdmin.from('coupons').delete().like('code', 'ECC-%');
});

async function loginAsAdmin(page: any) {
  const sessionData = {
    access_token: adminJwt,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "dummy",
    user: { id: adminUserId, email: "admin@kriya.com", role: "authenticated", aud: "authenticated" }
  };
  
  await page.goto(`${WEB_URL}/`);
  await page.evaluate((data) => {
    localStorage.setItem('sb-nmlhpeqpahihfwzbqmzp-auth-token', JSON.stringify(data));
  }, sessionData);
  
  await page.goto(`${WEB_URL}/admin`);
  await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
}

test.describe('C6 - E2E Promo & Laporan', () => {
  test.use({ baseURL: WEB_URL });

  test('1. CRUD Kupon Admin', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/admin/coupons');
    
    // Create new coupon
    await page.getByRole('button', { name: 'Tambah Kupon' }).click();
    
    await page.getByPlaceholder('Contoh: KRIYA2026').fill('ECC-TEST1');
    // Check kupon aktif
    await page.locator('label').filter({ hasText: 'Kupon Aktif' }).locator('input[type="checkbox"]').check();
    
    // Minimal belanja
    await page.locator('div').filter({ hasText: /^Minimal Belanja \(Rp\)$/ }).locator('input').fill('50000');
    // Limit pemakaian
    await page.locator('div').filter({ hasText: /^Limit Pemakaian \(Total\)$/ }).locator('input').fill('10');
    
    await page.getByRole('button', { name: 'Simpan' }).click();
    
    // Check if it appears in list
    await expect(page.locator('td', { hasText: 'ECC-TEST1' })).toBeVisible({ timeout: 10000 });
    
    // Edit coupon
    await page.locator('tr').filter({ hasText: 'ECC-TEST1' }).getByRole('button', { name: 'Edit' }).click();
    await page.locator('div').filter({ hasText: /^Deskripsi \(ID\)$/ }).locator('input').fill('Diskon E2E');
    // Toggle active
    await page.locator('label').filter({ hasText: 'Kupon Aktif' }).locator('input[type="checkbox"]').uncheck();
    await page.getByRole('button', { name: 'Simpan' }).click();
    
    // It should be marked nonaktif
    await expect(page.locator('tr').filter({ hasText: 'ECC-TEST1' })).toContainText('inactive', { timeout: 10000 });
    
    // Activate again
    await page.locator('tr').filter({ hasText: 'ECC-TEST1' }).getByRole('button', { name: 'Edit' }).click();
    await page.locator('label').filter({ hasText: 'Kupon Aktif' }).locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Simpan' }).click();
    
    // Create another coupon to test deletion when used
    await page.getByRole('button', { name: 'Tambah Kupon' }).click();
    await page.getByPlaceholder('Contoh: KRIYA2026').fill('ECC-USED');
    await page.getByRole('button', { name: 'Simpan' }).click();
    await expect(page.locator('td', { hasText: 'ECC-USED' })).toBeVisible({ timeout: 10000 });
    
    // Mark ECC-USED as used via Supabase
    const { data: couponData } = await supabaseAdmin.from('coupons').select('id').eq('code', 'ECC-USED').single();
    if (couponData) {
      await supabaseAdmin.from('coupon_redemptions').upsert({
        coupon_id: couponData.id,
        order_id: '00000000-0000-0000-0000-000000000001',
        user_id: adminUserId,
        items_discount: 10000,
        shipping_discount: 0,
        status: 'applied'
      });
    }
    
    // Delete unused coupon -> Success
    page.once('dialog', dialog => dialog.accept());
    await page.locator('tr').filter({ hasText: 'ECC-TEST1' }).getByRole('button', { name: 'Hapus' }).click();
    await expect(page.locator('td', { hasText: 'ECC-TEST1' })).not.toBeVisible();
    
    // Delete used coupon -> 409 Rejected
    page.once('dialog', dialog => dialog.accept());
    await page.locator('tr').filter({ hasText: 'ECC-USED' }).getByRole('button', { name: 'Hapus' }).click();
    await expect(page.locator('text=Kupon tidak dapat dihapus karena pernah dipakai').first()).toBeVisible({ timeout: 10000 });
  });

  test('2. Validasi Kupon (API)', async ({ request }) => {
    const dateNow = new Date();
    const datePast = new Date(dateNow.getTime() - 86400000);
    const dateFuture = new Date(dateNow.getTime() + 86400000);

    const headers = { Authorization: `Bearer ${adminJwt}` };
    
    const baseData = { applies_to: 'all', description_i18n: { id: "Test", en: "Test" } };
    // Create coupons via API
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-VALID', discount_type: 'percent', amount: 10, min_subtotal: 10, is_active: true }
    });
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-EXPIRED', discount_type: 'percent', amount: 10, ends_at: datePast.toISOString(), is_active: true }
    });
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-FUTURE', discount_type: 'percent', amount: 10, starts_at: dateFuture.toISOString(), is_active: true }
    });
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-MIN', discount_type: 'percent', amount: 10, min_subtotal: 9999999, is_active: true }
    });
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-LIMIT', discount_type: 'percent', amount: 10, usage_limit: 1, is_active: true }
    });
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-USER', discount_type: 'percent', amount: 10, usage_limit_per_user: 1, is_active: true }
    });

    // Mark ECC-LIMIT and ECC-USER as used
    const { data: coupons } = await supabaseAdmin.from('coupons').select('id, code').in('code', ['ECC-LIMIT', 'ECC-USER']);
    for (const c of coupons || []) {
      await supabaseAdmin.from('coupon_redemptions').upsert({
        coupon_id: c.id,
        order_id: '00000000-0000-0000-0000-000000000001',
        user_id: adminUserId,
        items_discount: 10000,
        shipping_discount: 0,
        status: 'applied'
      });
    }

    const lines = [{ VariantID: variantId, Qty: 1 }];
    const reqData = (code: string) => ({ code, lines });
    
    let res = await request.post(`${API_URL}/api/v1/coupons/validate`, { headers, data: reqData('ECC-VALID') });
    expect(res.status()).toBe(200);
    
    res = await request.post(`${API_URL}/api/v1/coupons/validate`, { headers, data: reqData('ECC-EXPIRED') });
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'expired' } });
    
    res = await request.post(`${API_URL}/api/v1/coupons/validate`, { headers, data: reqData('ECC-FUTURE') });
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'not_started' } });
    
    res = await request.post(`${API_URL}/api/v1/coupons/validate`, { headers, data: reqData('ECC-MIN') });
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'min_subtotal_not_met' } });
    
    res = await request.post(`${API_URL}/api/v1/coupons/validate`, { headers, data: reqData('ECC-LIMIT') });
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'usage_limit_reached' } });
    
    res = await request.post(`${API_URL}/api/v1/coupons/validate`, { headers, data: reqData('ECC-USER') });
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: 'user_limit_reached' } });
  });

  test('3. Banner promo publik (GET /coupons/public)', async ({ request }) => {
    const headers = { Authorization: `Bearer ${adminJwt}` };
    const datePast = new Date(Date.now() - 86400000);
    
    const baseData = { applies_to: 'all', description_i18n: { id: "Test", en: "Test" } };
    
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-PUB-ACTIVE', is_public: true, is_active: true, discount_type: 'percent', amount: 10 }
    });
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-PRIV', is_public: false, is_active: true, discount_type: 'percent', amount: 10 }
    });
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers, data: { ...baseData, code: 'ECC-PUB-EXP', is_public: true, is_active: true, discount_type: 'percent', amount: 10, ends_at: datePast.toISOString() }
    });
    
    const res = await request.get(`${API_URL}/api/v1/coupons/public`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const codes = body.data.map((c: any) => c.code);
    
    expect(codes).toContain('ECC-PUB-ACTIVE');
    expect(codes).not.toContain('ECC-PRIV');
    expect(codes).not.toContain('ECC-PUB-EXP');
  });

  test('4. Laporan admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');
    
    await expect(page.locator('text=Penjualan Kotor').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Penjualan Bersih').first()).toBeVisible();
    
    const select = page.locator('select').first();
    await select.selectOption({ label: 'Tahun Ini' });
    
    await expect(page.locator('text=Produk Terlaris').first()).toBeVisible();
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Unduh CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/sales-report.*\.csv/);
  });

  test('5. Dashboard v2', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    
    const metrics = [
      'Omzet Hari Ini',
      'Order Hari Ini',
      'Menunggu Bayar',
      'Perlu Dikirim',
      'Stok Menipis',
      'Ulasan Pending',
      'Retur Terbuka'
    ];
    
    for (const m of metrics) {
      await expect(page.locator('text=' + m).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
