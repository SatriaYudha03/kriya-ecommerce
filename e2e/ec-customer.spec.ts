import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import crypto from 'crypto';

const WEB_URL = process.env.WEB_URL || 'http://localhost:3002';
const API_URL = process.env.API_URL || 'http://localhost:8082';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmlhpeqpahihfwzbqmzp.supabase.co';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhwZXFwYWhpaGZ3emJxbXpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMwNDMwMywiZXhwIjoyMDk4ODgwMzAzfQ.JB3UXTwMTeIL3y_6G2F_5HA2zKnG-AUQ2BGND_nPcy4';
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET || 'Gfs0kTj4TcoY9jduiV4p2RyH2lRxQ53k/dS8aDOAIeKwTdxSPw2xDVqtDx1FZn8cejRFsaDzxurA3Tu0s3Co9g==';

const REST = `${supabaseUrl}/rest/v1`;

let customerJwt = '';
let adminJwt = '';
const customerUserId = 'f9ecfeea-90aa-4fa6-8861-73deaa769c41';
const adminUserId = 'dfdcd5c8-3403-41fc-920c-5377a32ca907';

let testVariantId = '';
let testProductId = '';

const TEST_ORDER_B7_ID = '00000000-0000-0000-0000-0000000000b7';

interface RestRow {
  id: string;
  code?: string;
  product_id?: string;
}

interface AddressDto {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  address_line: string;
  district?: string | null;
  city: string;
  province_code: string;
  province: string;
  postal_code: string;
  notes?: string | null;
  is_default: boolean;
  created_at: string;
}

interface CartItemDto {
  variant_id: string;
  qty: number;
  price: number;
  stock: number;
  subtotal: number;
  product: {
    slug: string;
    name: string;
    thumbnail_url: string;
    color: string;
    size: string | null;
  };
}

interface CartDto {
  items: CartItemDto[];
  total: number;
}

interface ProvinceDto {
  code: string;
  name: string;
  zone_code: string;
}

interface ContinuePaymentDto {
  snap_token: string;
  midtrans_client_key: string;
  expires_at: string;
}

interface ShippingZoneDto {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  provinces?: Array<{ code: string; name: string }>;
  methods?: Array<{ id: string; code: string; name: string; rate_type: string; base_cost: number }>;
}

async function restSelect(request: APIRequestContext, table: string, columns: string, filter: string): Promise<RestRow[]> {
  const res = await request.get(`${REST}/${table}?select=${encodeURIComponent(columns)}${filter ? `&${filter}` : ''}`, {
    headers: { apikey: supabaseServiceRole, Authorization: `Bearer ${supabaseServiceRole}` },
  });
  return (await res.json()) as RestRow[];
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

async function loginAsCustomer(page: Page) {
  const sessionData = {
    access_token: customerJwt,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: '',
    user: { id: customerUserId, email: 'ec-b@kriya.test', role: 'authenticated', aud: 'authenticated' },
  };

  await page.context().addCookies([
    {
      name: 'sb-nmlhpeqpahihfwzbqmzp-auth-token',
      value: encodeURIComponent(JSON.stringify(sessionData)),
      url: WEB_URL,
    },
  ]);

  await page.addInitScript((data) => {
    localStorage.setItem('sb-nmlhpeqpahihfwzbqmzp-auth-token', JSON.stringify(data));
  }, sessionData);
}

async function loginAsAdmin(page: Page) {
  const sessionData = {
    access_token: adminJwt,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: '',
    user: { id: adminUserId, email: 'admin@kriya.com', role: 'authenticated', aud: 'authenticated' },
  };

  await page.context().addCookies([
    {
      name: 'sb-nmlhpeqpahihfwzbqmzp-auth-token',
      value: encodeURIComponent(JSON.stringify(sessionData)),
      url: WEB_URL,
    },
  ]);

  await page.addInitScript((data) => {
    localStorage.setItem('sb-nmlhpeqpahihfwzbqmzp-auth-token', JSON.stringify(data));
  }, sessionData);
  await page.goto(`${WEB_URL}/admin`);
  await expect(page.locator('h1').first()).toContainText(/dashboard/i, { timeout: 15000 });
}

function mintJwt(userId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    aud: 'authenticated',
    role: 'authenticated',
    sub: userId,
    email,
    exp: now + 3600 * 24 * 30,
    iat: now,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', supabaseJwtSecret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

test.beforeAll(async ({ request }) => {
  customerJwt = mintJwt(customerUserId, 'ec-b@kriya.test');
  adminJwt = mintJwt(adminUserId, 'admin@kriya.com');

  // Get sample product and variant for testing cart
  const variants = await restSelect(request, 'product_variants', 'id,product_id', 'limit=1');
  if (variants[0]) {
    testVariantId = variants[0].id;
    testProductId = variants[0].product_id ?? '';
  }

  // Clean up any lingering test data
  await restDelete(request, 'payment_attempts', `order_id=eq.${TEST_ORDER_B7_ID}`);
  await restDelete(request, 'order_items', `order_id=eq.${TEST_ORDER_B7_ID}`);
  await restDelete(request, 'orders', `id=eq.${TEST_ORDER_B7_ID}`);
  await restDelete(request, 'addresses', `label=like.EC-B*`);
});

test.afterAll(async ({ request }) => {
  // Clean up test data
  await restDelete(request, 'payment_attempts', `order_id=eq.${TEST_ORDER_B7_ID}`);
  await restDelete(request, 'order_items', `order_id=eq.${TEST_ORDER_B7_ID}`);
  await restDelete(request, 'orders', `id=eq.${TEST_ORDER_B7_ID}`);
  await restDelete(request, 'addresses', `label=like.EC-B*`);

  // Reset customer cart to empty
  if (customerJwt) {
    await request.put(`${API_URL}/api/v1/cart`, {
      headers: { Authorization: `Bearer ${customerJwt}` },
      data: { items: [] },
    });
  }
});

test.describe('B7 - E2E Customer & Checkout', () => {
  test.use({ baseURL: WEB_URL });

  test('1. Alamat CRUD & Validasi', async ({ request }) => {
    const headers = { Authorization: `Bearer ${customerJwt}` };

    // 1.1 Validation error: phone not in Indonesian format
    const invalidPhoneRes = await request.post(`${API_URL}/api/v1/addresses`, {
      headers,
      data: {
        label: 'EC-B Rumah Invalid',
        recipient: 'Budi Test',
        phone: '12345',
        address_line: 'Jalan Percobaan No 10',
        city: 'Jakarta Selatan',
        province_code: '31',
        postal_code: '12345',
        is_default: false,
      },
    });
    expect(invalidPhoneRes.status()).toBe(400);
    const invalidPhoneJson = (await invalidPhoneRes.json()) as { error: { code: string } };
    expect(invalidPhoneJson.error.code).toBe('validation_error');

    // 1.2 Validation error: missing required recipient
    const missingFieldRes = await request.post(`${API_URL}/api/v1/addresses`, {
      headers,
      data: {
        label: 'EC-B Alamat Tanpa Nama',
        recipient: '',
        phone: '081234567890',
        address_line: 'Jalan Percobaan No 10',
        city: 'Jakarta Selatan',
        province_code: '31',
        postal_code: '12345',
        is_default: false,
      },
    });
    expect(missingFieldRes.status()).toBe(400);

    // 1.3 Create address successfully
    const createRes = await request.post(`${API_URL}/api/v1/addresses`, {
      headers,
      data: {
        label: 'EC-B Rumah Utama',
        recipient: 'Budi Santoso',
        phone: '081234567890',
        address_line: 'Jalan Gandaria Tengah No. 15',
        district: 'Kebayoran Baru',
        city: 'Jakarta Selatan',
        province_code: '31',
        postal_code: '12130',
        notes: 'Dekat taman kota',
        is_default: true,
      },
    });
    expect(createRes.status()).toBe(201);
    const createdAddress = ((await createRes.json()) as { data: AddressDto }).data;
    expect(createdAddress.label).toBe('EC-B Rumah Utama');
    expect(createdAddress.recipient).toBe('Budi Santoso');
    expect(createdAddress.province_code).toBe('31');
    expect(createdAddress.is_default).toBe(true);

    const addressId = createdAddress.id;

    // 1.4 Get addresses list - verify newly created address is present
    const listRes = await request.get(`${API_URL}/api/v1/addresses`, { headers });
    expect(listRes.status()).toBe(200);
    const addresses = ((await listRes.json()) as { data: AddressDto[] }).data;
    const found = addresses.find((a) => a.id === addressId);
    expect(found).toBeDefined();
    expect(found?.label).toBe('EC-B Rumah Utama');

    // 1.5 Update address details
    const updateRes = await request.put(`${API_URL}/api/v1/addresses/${addressId}`, {
      headers,
      data: {
        label: 'EC-B Rumah Terupdate',
        recipient: 'Budi Santoso Perkasa',
        phone: '081234567891',
        address_line: 'Jalan Gandaria Tengah No. 99',
        district: 'Kebayoran Baru',
        city: 'Jakarta Selatan',
        province_code: '31',
        postal_code: '12130',
        notes: 'Pagar warna hitam',
        is_default: false,
      },
    });
    expect(updateRes.status()).toBe(200);
    const updatedAddress = ((await updateRes.json()) as { data: AddressDto }).data;
    expect(updatedAddress.label).toBe('EC-B Rumah Terupdate');
    expect(updatedAddress.recipient).toBe('Budi Santoso Perkasa');

    // 1.6 Set address as default
    const setDefaultRes = await request.post(`${API_URL}/api/v1/addresses/${addressId}/default`, { headers });
    expect(setDefaultRes.status()).toBe(200);
    const defaultAddress = ((await setDefaultRes.json()) as { data: AddressDto }).data;
    expect(defaultAddress.is_default).toBe(true);

    // 1.7 Delete address
    const deleteRes = await request.delete(`${API_URL}/api/v1/addresses/${addressId}`, { headers });
    expect(deleteRes.status()).toBe(200);

    // 1.8 Verify address is deleted
    const verifyListRes = await request.get(`${API_URL}/api/v1/addresses`, { headers });
    const verifyAddresses = ((await verifyListRes.json()) as { data: AddressDto[] }).data;
    expect(verifyAddresses.find((a) => a.id === addressId)).toBeUndefined();
  });

  test('2. Merge Keranjang Guest -> Login & Operasi Keranjang', async ({ request }) => {
    const headers = { Authorization: `Bearer ${customerJwt}` };
    expect(testVariantId).toBeTruthy();

    // 2.1 Reset cart to empty
    const resetRes = await request.put(`${API_URL}/api/v1/cart`, {
      headers,
      data: { items: [] },
    });
    expect(resetRes.status()).toBe(200);
    const emptyCart = ((await resetRes.json()) as { data: CartDto }).data;
    expect(emptyCart.items.length).toBe(0);

    // 2.2 Guest cart items to merge (simulate guest logging in with 2 units)
    const guestItems = [{ variant_id: testVariantId, qty: 2 }];
    const mergeRes = await request.post(`${API_URL}/api/v1/cart/merge`, {
      headers,
      data: { items: guestItems },
    });
    expect(mergeRes.status()).toBe(200);
    const mergedCart = ((await mergeRes.json()) as { data: CartDto }).data;
    expect(mergedCart.items.length).toBe(1);
    expect(mergedCart.items[0].variant_id).toBe(testVariantId);
    expect(mergedCart.items[0].qty).toBe(2);
    expect(mergedCart.items[0].subtotal).toBe(mergedCart.items[0].price * 2);
    expect(mergedCart.total).toBe(mergedCart.items[0].subtotal);

    // 2.3 Merge again with 1 unit -> upsert behavior sets quantity to 1
    const mergeMoreRes = await request.post(`${API_URL}/api/v1/cart/merge`, {
      headers,
      data: { items: [{ variant_id: testVariantId, qty: 1 }] },
    });
    expect(mergeMoreRes.status()).toBe(200);
    const updatedCart = ((await mergeMoreRes.json()) as { data: CartDto }).data;
    expect(updatedCart.items[0].qty).toBe(1);

    // 2.4 Verify GET /cart persists the items
    const getCartRes = await request.get(`${API_URL}/api/v1/cart`, { headers });
    expect(getCartRes.status()).toBe(200);
    const fetchedCart = ((await getCartRes.json()) as { data: CartDto }).data;
    expect(fetchedCart.items.length).toBe(1);
    expect(fetchedCart.items[0].qty).toBe(1);

    // 2.5 Clean up cart
    await request.put(`${API_URL}/api/v1/cart`, {
      headers,
      data: { items: [] },
    });
  });

  test('4. Ongkir per Provinsi & Admin Shipping Zones', async ({ request }) => {
    // 4.1 Public GET /shipping/provinces returns 38 provinces
    const provincesRes = await request.get(`${API_URL}/api/v1/shipping/provinces`);
    expect(provincesRes.status()).toBe(200);
    const provinces = ((await provincesRes.json()) as { data: ProvinceDto[] }).data;
    expect(provinces.length).toBe(38);

    const dki = provinces.find((p) => p.code === '31');
    expect(dki).toBeDefined();
    expect(dki?.zone_code).toBe('jawa_bali');

    const papua = provinces.find((p) => p.code === '91');
    expect(papua).toBeDefined();
    expect(papua?.zone_code).toBe('timur');

    // 4.2 Admin GET /admin/shipping/zones
    const adminHeaders = { Authorization: `Bearer ${adminJwt}` };
    const zonesRes = await request.get(`${API_URL}/api/v1/admin/shipping/zones`, { headers: adminHeaders });
    expect(zonesRes.status()).toBe(200);
    const zones = ((await zonesRes.json()) as { data: ShippingZoneDto[] }).data;
    expect(zones.length).toBeGreaterThanOrEqual(2);

    const jawaZone = zones.find((z) => z.code === 'jawa_bali');
    expect(jawaZone).toBeDefined();
    expect(jawaZone?.is_active).toBe(true);
  });

  test('5. Lanjut Bayar (Continue Payment)', async ({ request }) => {
    const headers = { Authorization: `Bearer ${customerJwt}` };

    // 5.1 404 for non-existent order
    const notFoundRes = await request.post(`${API_URL}/api/v1/orders/00000000-0000-0000-0000-000000000099/pay`, {
      headers,
    });
    expect(notFoundRes.status()).toBe(404);

    // 5.2 Seed pending order for customer
    await restUpsert(request, 'orders', {
      id: TEST_ORDER_B7_ID,
      order_number: 'EC-B-PAY-1',
      user_id: customerUserId,
      status: 'pending_payment',
      subtotal: 500000,
      total: 500000,
      shipping_zone: 'jawa_bali',
      shipping_cost: 0,
      shipping_address: {
        recipient: 'Budi Test',
        phone: '081234567890',
        address_line: 'Jalan Test No 1',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postal_code: '12130',
      },
    }, 'id');

    // 5.3 Attempt pay order -> 200 with Snap token
    const payRes = await request.post(`${API_URL}/api/v1/orders/${TEST_ORDER_B7_ID}/pay`, { headers });
    expect(payRes.status()).toBe(200);
    const payData = ((await payRes.json()) as { data: ContinuePaymentDto }).data;
    expect(payData.snap_token).toBeTruthy();
    expect(payData.midtrans_client_key).toBeTruthy();
    expect(payData.expires_at).toBeTruthy();

    const firstToken = payData.snap_token;

    // 5.4 Re-attempt pay order while attempt is active -> returns reusable token
    const retryPayRes = await request.post(`${API_URL}/api/v1/orders/${TEST_ORDER_B7_ID}/pay`, { headers });
    expect(retryPayRes.status()).toBe(200);
    const retryPayData = ((await retryPayRes.json()) as { data: ContinuePaymentDto }).data;
    expect(retryPayData.snap_token).toBe(firstToken);

    // 5.5 Update order to paid -> attempt pay returns 409 Conflict
    await restUpsert(request, 'orders', {
      id: TEST_ORDER_B7_ID,
      order_number: 'EC-B-PAY-1',
      user_id: customerUserId,
      status: 'paid',
      subtotal: 500000,
      total: 500000,
      shipping_zone: 'jawa_bali',
      shipping_cost: 0,
      shipping_address: {},
    }, 'id');

    const conflictRes = await request.post(`${API_URL}/api/v1/orders/${TEST_ORDER_B7_ID}/pay`, { headers });
    expect(conflictRes.status()).toBe(409);

    // 5.6 Clean up test order
    await restDelete(request, 'payment_attempts', `order_id=eq.${TEST_ORDER_B7_ID}`);
    await restDelete(request, 'orders', `id=eq.${TEST_ORDER_B7_ID}`);
  });

  test('6. UI Halaman Customer', async ({ page }) => {
    // 6.1 Guest view cart page
    await page.goto('/cart');
    await expect(page.locator('h1, button, a').filter({ hasText: /keranjang|cart/i }).first()).toBeVisible({ timeout: 15000 });

    // 6.2 Authenticated customer pages
    await loginAsCustomer(page);

    await page.goto('/account/addresses');
    await expect(page.locator('h1').filter({ hasText: /alamat|address/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button').filter({ hasText: /tambah|add/i }).first()).toBeVisible({ timeout: 15000 });

  });

  test('7. UI Halaman Admin Pelanggan, Pengiriman, Pengaturan', async ({ page }) => {
    test.setTimeout(60000);
    await loginAsAdmin(page);

    await page.goto('/admin/customers');
    await expect(page.locator('h1').filter({ hasText: /pelanggan|customer/i }).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/admin/shipping');
    await expect(page.locator('h1, h2, div').filter({ hasText: /pengiriman|shipping/i }).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/admin/settings');
    await expect(page.locator('h1').filter({ hasText: /pengaturan|settings/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
