import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'child_process';

const WEB_URL = process.env.WEB_URL || 'http://localhost:3003';
const API_URL = process.env.API_URL || 'http://localhost:8083';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmlhpeqpahihfwzbqmzp.supabase.co';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhwZXFwYWhpaGZ3emJxbXpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMwNDMwMywiZXhwIjoyMDk4ODgwMzAzfQ.JB3UXTwMTeIL3y_6G2F_5HA2zKnG-AUQ2BGND_nPcy4';

const REST = `${supabaseUrl}/rest/v1`;

let adminJwt = '';
const adminUserId = 'dfdcd5c8-3403-41fc-920c-5377a32ca907';
let variantId = '';
let productId = '';

const DUMMY_ORDER_1 = '00000000-0000-0000-0000-000000000001';
const DUMMY_ORDER_2 = '00000000-0000-0000-0000-000000000002';
const DUMMY_ORDER_3 = '00000000-0000-0000-0000-000000000003';
const PAID_ORDER = '00000000-0000-0000-0000-000000000004';

// Kode kupon milik TEST INI SAJA (bukan seed demo `ECC-DISKON10`/`ECC-HEMAT50K`/
// `ECC-GRATISONGKIR`/`ECC-VIPMEMBER`/`ECC-PRIVAT100K` di supabase/seed/ec-v2/promo.sql).
// R12: hanya boleh membersihkan data yang dibuat sendiri -- wildcard `code=like.ECC-*`
// pernah ikut menghapus seed demo, membuat test 7 (banner) flaky. Daftar eksplisit di sini.
const TEST_COUPON_CODES = [
  'ECC-CRUD',
  'ECC-USED',
  'ECC-VALID',
  'ECC-EXPIRED',
  'ECC-FUTURE',
  'ECC-MIN',
  'ECC-LIMIT',
  'ECC-PUB-ACTIVE',
  'ECC-PRIV',
  'ECC-PUB-EXP',
  'ECC-STOREFRONT',
];
const TEST_COUPON_FILTER = `code=in.(${TEST_COUPON_CODES.join(',')})`;

interface RestRow {
  id: string;
  code?: string;
  product_id?: string;
}

async function restSelect(request: APIRequestContext, table: string, columns: string, filter: string): Promise<RestRow[]> {
  const res = await request.get(`${REST}/${table}?select=${encodeURIComponent(columns)}${filter ? `&${filter}` : ''}`, {
    headers: { apikey: supabaseServiceRole, Authorization: `Bearer ${supabaseServiceRole}` },
  });
  return (await res.json()) as RestRow[];
}

async function restInsert(request: APIRequestContext, table: string, row: Record<string, unknown>): Promise<RestRow | null> {
  const res = await request.post(`${REST}/${table}`, {
    headers: {
      apikey: supabaseServiceRole,
      Authorization: `Bearer ${supabaseServiceRole}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    data: row,
  });
  if (!res.ok()) return null;
  const arr = (await res.json()) as RestRow[];
  return arr[0] ?? null;
}

async function restUpsert(request: APIRequestContext, table: string, row: Record<string, unknown>, conflict: string): Promise<void> {
  await request.post(`${REST}/${table}?on_conflict=${conflict}`, {
    headers: {
      apikey: supabaseServiceRole,
      Authorization: `Bearer ${supabaseServiceRole}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    data: row,
  });
}

async function restDelete(request: APIRequestContext, table: string, filter: string): Promise<void> {
  await request.delete(`${REST}/${table}?${filter}`, {
    headers: { apikey: supabaseServiceRole, Authorization: `Bearer ${supabaseServiceRole}` },
  });
}

test.beforeAll(async ({ request }) => {
  adminJwt = execFileSync(
    'go',
    ['run', 'main.go', '-email', 'admin@kriya.com'],
    { cwd: 'C:\\Porto\\kriya-wt\\agent-c\\scripts\\ec-v2\\mintjwt', encoding: 'utf8' }
  ).trim().split('\n').pop() ?? '';

  // A variant id is needed for coupon validation lines.
  const variants = await restSelect(request, 'product_variants', 'id,product_id', 'limit=1');
  if (variants[0]) {
    variantId = variants[0].id;
    productId = variants[0].product_id ?? '';
  }

  // Seed dummy orders so coupon_redemptions can reference them (1 coupon per order).
  const orderSeed = { user_id: adminUserId, status: 'pending_payment', subtotal: 0, total: 0, shipping_zone: 'jawa_bali', shipping_cost: 0, shipping_address: {} };
  await restUpsert(request, 'orders', { id: DUMMY_ORDER_1, order_number: 'DUMMY1', ...orderSeed }, 'id');
  await restUpsert(request, 'orders', { id: DUMMY_ORDER_2, order_number: 'DUMMY2', ...orderSeed }, 'id');
  await restUpsert(request, 'orders', { id: DUMMY_ORDER_3, order_number: 'DUMMY3', ...orderSeed }, 'id');

  // Seed a paid order + item so the reports page has sales data (CSV + top products).
  await restUpsert(request, 'orders', {
    id: PAID_ORDER,
    order_number: 'DUMMY-PAID',
    user_id: adminUserId,
    status: 'paid',
    subtotal: 100000,
    total: 100000,
    shipping_zone: 'jawa_bali',
    shipping_cost: 0,
    shipping_address: {},
    paid_at: new Date().toISOString(),
  }, 'id');
  if (productId && variantId) {
    await restUpsert(request, 'order_items', {
      id: '00000000-0000-0000-0000-000000000004',
      order_id: PAID_ORDER,
      variant_id: variantId,
      product_id: productId,
      name: 'E2E Seed Product',
      qty: 1,
      price: 100000,
      subtotal: 100000,
    }, 'id');
  }

  // Clean up any leftover test data (hanya kode milik test ini, lihat TEST_COUPON_CODES).
  await restDelete(request, 'coupon_redemptions', `order_id=in.(${DUMMY_ORDER_1},${DUMMY_ORDER_2},${DUMMY_ORDER_3})`);
  await restDelete(request, 'coupons', TEST_COUPON_FILTER);
});

test.afterAll(async ({ request }) => {
  await restDelete(request, 'coupon_redemptions', `order_id=in.(${DUMMY_ORDER_1},${DUMMY_ORDER_2},${DUMMY_ORDER_3})`);
  await restDelete(request, 'coupons', TEST_COUPON_FILTER);
});

async function loginAsAdmin(page: Page) {
  const sessionData = {
    access_token: adminJwt,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: '',
    user: { id: adminUserId, email: 'admin@kriya.com', role: 'authenticated', aud: 'authenticated' },
  };

  await page.addInitScript((data) => {
    localStorage.setItem('sb-nmlhpeqpahihfwzbqmzp-auth-token', JSON.stringify(data));
  }, sessionData);
  await page.goto(`${WEB_URL}/admin`);
  await expect(page.locator('h1').first()).toContainText('Dashboard', { timeout: 15000 });
}

test.describe('C6 - E2E Promo & Laporan', () => {
  test.use({ baseURL: WEB_URL });

  test('1. CRUD Kupon Admin', async ({ request }) => {
    const headers = { Authorization: `Bearer ${adminJwt}` };
    const baseData = { applies_to: 'all', description_i18n: { id: 'Test', en: 'Test' } };

    // Create (percent, min_subtotal, usage_limit)
    const createRes = await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers,
      data: { ...baseData, code: 'ECC-CRUD', discount_type: 'percent', amount: 10, min_subtotal: 50000, usage_limit: 10, is_active: true },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()).data;
    expect(created.code).toBe('ECC-CRUD');
    expect(created.discount_type).toBe('percent');
    expect(created.min_subtotal).toBe(50000);
    expect(created.usage_limit).toBe(10);

    // Verify it appears in the list
    const listRes = await request.get(`${API_URL}/api/v1/admin/coupons?page=1&limit=20`, { headers });
    expect(listRes.status()).toBe(200);
    const listCodes = (await listRes.json()).data.map((c: { code: string }) => c.code);
    expect(listCodes).toContain('ECC-CRUD');

    // Edit description and deactivate
    const editRes = await request.put(`${API_URL}/api/v1/admin/coupons/${created.id}`, {
      headers,
      data: { ...baseData, code: 'ECC-CRUD', description_i18n: { id: 'Diubah', en: 'Changed' }, discount_type: 'percent', amount: 10, min_subtotal: 50000, usage_limit: 10, is_active: false },
    });
    expect(editRes.status()).toBe(200);
    const edited = (await editRes.json()).data;
    expect(edited.description_i18n.id).toBe('Diubah');
    expect(edited.status).toBe('inactive');

    // Reactivate
    const activateRes = await request.put(`${API_URL}/api/v1/admin/coupons/${created.id}`, {
      headers,
      data: { ...baseData, code: 'ECC-CRUD', description_i18n: { id: 'Diubah', en: 'Changed' }, discount_type: 'percent', amount: 10, min_subtotal: 50000, usage_limit: 10, is_active: true },
    });
    expect(activateRes.status()).toBe(200);
    expect((await activateRes.json()).data.status).toBe('active');

    // Delete unused coupon -> success
    const deleteRes = await request.delete(`${API_URL}/api/v1/admin/coupons/${created.id}`, { headers });
    expect(deleteRes.status()).toBe(200);

    // Create a coupon that has been redeemed, then deleting it must be rejected (409)
    const usedCreate = await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers,
      data: { ...baseData, code: 'ECC-USED', discount_type: 'percent', amount: 10, is_active: true },
    });
    const usedId = (await usedCreate.json()).data.id;
    await restInsert(request, 'coupon_redemptions', {
      coupon_id: usedId,
      order_id: DUMMY_ORDER_1,
      user_id: adminUserId,
      items_discount: 10000,
      shipping_discount: 0,
      status: 'applied',
    });

    const usedDeleteRes = await request.delete(`${API_URL}/api/v1/admin/coupons/${usedId}`, { headers });
    expect(usedDeleteRes.status()).toBe(409);
  });

  test('2. Validasi Kupon (API)', async ({ request }) => {
    const dateNow = new Date();
    const datePast = new Date(dateNow.getTime() - 86400000);
    const dateFuture = new Date(dateNow.getTime() + 86400000);

    const headers = { Authorization: `Bearer ${adminJwt}` };
    const baseData = { applies_to: 'all', description_i18n: { id: 'Test', en: 'Test' } };

    await request.post(`${API_URL}/api/v1/admin/coupons`, { headers, data: { ...baseData, code: 'ECC-VALID', discount_type: 'percent', amount: 10, min_subtotal: 10, is_active: true } });
    await request.post(`${API_URL}/api/v1/admin/coupons`, { headers, data: { ...baseData, code: 'ECC-EXPIRED', discount_type: 'percent', amount: 10, ends_at: datePast.toISOString(), is_active: true } });
    await request.post(`${API_URL}/api/v1/admin/coupons`, { headers, data: { ...baseData, code: 'ECC-FUTURE', discount_type: 'percent', amount: 10, starts_at: dateFuture.toISOString(), is_active: true } });
    await request.post(`${API_URL}/api/v1/admin/coupons`, { headers, data: { ...baseData, code: 'ECC-MIN', discount_type: 'percent', amount: 10, min_subtotal: 9999999, is_active: true } });
    await request.post(`${API_URL}/api/v1/admin/coupons`, { headers, data: { ...baseData, code: 'ECC-LIMIT', discount_type: 'percent', amount: 10, usage_limit: 1, is_active: true } });

    // Mark ECC-LIMIT as redeemed (quota exhausted).
    const limitCoupons = await restSelect(request, 'coupons', 'id', 'code=eq.ECC-LIMIT');
    if (limitCoupons[0]) {
      await restInsert(request, 'coupon_redemptions', {
        coupon_id: limitCoupons[0].id,
        order_id: DUMMY_ORDER_2,
        user_id: adminUserId,
        items_discount: 10,
        shipping_discount: 0,
        status: 'applied',
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
  });

  test('3. Banner promo publik (GET /coupons/public)', async ({ request }) => {
    const headers = { Authorization: `Bearer ${adminJwt}` };
    const datePast = new Date(Date.now() - 86400000);
    const baseData = { applies_to: 'all', description_i18n: { id: 'Test', en: 'Test' } };

    await request.post(`${API_URL}/api/v1/admin/coupons`, { headers, data: { ...baseData, code: 'ECC-PUB-ACTIVE', is_public: true, is_active: true, discount_type: 'percent', amount: 10 } });
    await request.post(`${API_URL}/api/v1/admin/coupons`, { headers, data: { ...baseData, code: 'ECC-PRIV', is_public: false, is_active: true, discount_type: 'percent', amount: 10 } });
    await request.post(`${API_URL}/api/v1/admin/coupons`, { headers, data: { ...baseData, code: 'ECC-PUB-EXP', is_public: true, is_active: true, discount_type: 'percent', amount: 10, ends_at: datePast.toISOString() } });

    const res = await request.get(`${API_URL}/api/v1/coupons/public`);
    expect(res.status()).toBe(200);
    const codes = (await res.json()).data.map((c: { code: string }) => c.code);

    expect(codes).toContain('ECC-PUB-ACTIVE');
    expect(codes).not.toContain('ECC-PRIV');
    expect(codes).not.toContain('ECC-PUB-EXP');
  });

  test('4. Laporan admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/reports');

    await expect(page.locator('text=Penjualan Kotor').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Penjualan Bersih').first()).toBeVisible();
    await expect(page.locator('text=Produk Terlaris').first()).toBeVisible();

    // Change the interval period and verify the chart/summary still renders.
    await page.getByRole('combobox').first().click();
    await page.locator('text=Bulanan').first().click();
    await expect(page.locator('text=Grafik Penjualan Bersih').first()).toBeVisible();

    // Download CSV (blob download via anchor) and verify it is non-empty.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Unduh CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/sales_report_.*\.csv/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const content = Buffer.concat(chunks).toString('utf8');
    expect(content.trim().length).toBeGreaterThan(0);
  });

  test('5. Dashboard v2', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    const metrics = [
      'Pendapatan Hari Ini',
      'Pesanan Hari Ini',
      'Menunggu Pembayaran',
      'Perlu Dikirim',
      'Stok Menipis',
      'Ulasan Menunggu',
      'Retur Terbuka',
    ];

    for (const m of metrics) {
      await expect(page.locator('text=' + m).first()).toBeVisible({ timeout: 15000 });
    }
  });

  test('6. Manajemen Kupon (UI Admin)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/coupons');

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    const addBtn = page.getByRole('button', { name: /Tambah Kupon|Add Coupon/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/Kode Kupon|Coupon Code/i)).toBeVisible();

    const cancelBtn = dialog.getByRole('button', { name: /Batal|Cancel/i });
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
  });

  test('7. Banner Promo & Salin Kode (Storefront)', async ({ page, request }) => {
    const headers = { Authorization: `Bearer ${adminJwt}` };
    const baseData = { applies_to: 'all', description_i18n: { id: 'Promo Spesial UI', en: 'Special UI Promo' } };
    await request.post(`${API_URL}/api/v1/admin/coupons`, {
      headers,
      data: { ...baseData, code: 'ECC-STOREFRONT', is_public: true, is_active: true, discount_type: 'percent', amount: 15 },
    });

    await page.goto('/');
    await expect(page.locator('text=ECC-STOREFRONT').first()).toBeVisible({ timeout: 15000 });
    const copyBtn = page.locator('button[aria-label*="ECC-STOREFRONT"], button[title*="Salin"], button[title*="Copy"]').first();
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
    }
  });
});
