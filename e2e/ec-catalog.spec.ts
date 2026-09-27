import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'child_process';
import path from 'path';

const WEB_URL = process.env.WEB_URL || 'http://localhost:3001';
const API_URL = process.env.API_URL || 'http://localhost:8081';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmlhpeqpahihfwzbqmzp.supabase.co';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhwZXFwYWhpaGZ3emJxbXpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMwNDMwMywiZXhwIjoyMDk4ODgwMzAzfQ.JB3UXTwMTeIL3y_6G2F_5HA2zKnG-AUQ2BGND_nPcy4';

const REST = `${supabaseUrl}/rest/v1`;

let adminJwt = '';
const adminUserId = 'dfdcd5c8-3403-41fc-920c-5377a32ca907';

interface RestRow {
  id: string;
  slug?: string;
  name?: string;
  status?: string;
  price_min?: number;
  regular_price_min?: number;
  on_sale?: boolean;
}

interface ApiListResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

interface ProductItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  price_min: number;
  regular_price_min?: number;
  on_sale: boolean;
}

interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  price_min: number;
  regular_price_min?: number;
  on_sale: boolean;
  variants: {
    id: string;
    sku: string;
    price: number;
    regular_price?: number;
  }[];
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

async function restUpdate(request: APIRequestContext, table: string, filter: string, row: Record<string, unknown>): Promise<void> {
  await request.patch(`${REST}/${table}?${filter}`, {
    headers: {
      apikey: supabaseServiceRole,
      Authorization: `Bearer ${supabaseServiceRole}`,
      'Content-Type': 'application/json',
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
  try {
    const mintDir = path.resolve(__dirname, '../scripts/ec-v2/mintjwt');
    const out = execFileSync(
      'go',
      ['run', 'main.go', '-email', 'admin@kriya.com'],
      { cwd: mintDir, encoding: 'utf8' }
    );
    const lines = out.split(/\r?\n/);
    adminJwt = lines.find((l) => l.trim().startsWith('eyJ'))?.trim() ?? '';
  } catch (err) {
    console.error('Failed to mint JWT:', err);
  }

  // Bersihkan sisa data uji ec-a-*
  await restDelete(request, 'product_images', 'storage_path=like.test/ec-a-*');
  await restDelete(request, 'product_variants', 'sku=like.ECA-*');
  await restDelete(request, 'products', 'slug=like.ec-a-*');
});

test.afterAll(async ({ request }) => {
  // Pembersihan seluruh data uji berprefix ec-a-* dan ECA-*
  await restDelete(request, 'product_images', 'storage_path=like.test/ec-a-*');
  await restDelete(request, 'product_variants', 'sku=like.ECA-*');
  await restDelete(request, 'products', 'slug=like.ec-a-*');
});

test.describe('Katalog & Inventori E2E (A7)', () => {
  test('1. Draft tidak tampil di katalog publik tapi ada di admin', async ({ request, page }) => {
    // Buat produk berstatus draft
    const draftProd = await restInsert(request, 'products', {
      slug: 'ec-a-meja-draft',
      name: 'Meja Draft EC-A',
      name_i18n: { en: 'Draft Desk EC-A', id: 'Meja Draft EC-A' },
      category_slug: 'workspace',
      description: 'Deskripsi meja draft',
      status: 'draft',
      materials: ['pine wood'],
      dimensions: { width_cm: 100, depth_cm: 60, height_cm: 75 },
      weight_kg: 10,
    });
    expect(draftProd).not.toBeNull();

    if (draftProd) {
      await restInsert(request, 'product_variants', {
        product_id: draftProd.id,
        sku: 'ECA-DFT-001',
        color: 'natural',
        price: 1200000,
        stock: 5,
        is_active: true,
      });

      await restInsert(request, 'product_images', {
        product_id: draftProd.id,
        storage_path: 'products/taru-work-desk-1.jpg',
        alt: 'Meja Draft EC-A',
        is_primary: true,
      });
    }

    // 1. Publik: GET /api/v1/products?q=ec-a-meja-draft TIDAK memunculkan produk draft
    const pubListRes = await request.get(`${API_URL}/api/v1/products?q=ec-a-meja-draft`);
    expect(pubListRes.ok()).toBeTruthy();
    const pubListJson = (await pubListRes.json()) as ApiListResponse<ProductItem>;
    const foundInPublic = (pubListJson.data || []).some((p) => p.slug === 'ec-a-meja-draft');
    expect(foundInPublic).toBeFalsy();

    // 2. Publik: GET /api/v1/products/ec-a-meja-draft mengembalikan 404
    const pubDetailRes = await request.get(`${API_URL}/api/v1/products/ec-a-meja-draft`);
    expect(pubDetailRes.status()).toBe(404);

    // 3. Web UI: Navigasi langsung ke /products/ec-a-meja-draft menampilkan state tidak ditemukan
    await page.goto(`${WEB_URL}/products/ec-a-meja-draft`);
    await expect(page.getByText('Meja Draft EC-A')).not.toBeVisible();
    await expect(page.getByText('Produk tidak ditemukan')).toBeVisible({ timeout: 15000 });

    // 4. Admin API: GET /api/v1/admin/products?status=draft memunculkan produk
    if (adminJwt) {
      const adminListRes = await request.get(`${API_URL}/api/v1/admin/products?status=draft&q=ec-a-meja-draft`, {
        headers: { Authorization: `Bearer ${adminJwt}` },
      });
      expect(adminListRes.ok()).toBeTruthy();
      const adminListJson = (await adminListRes.json()) as ApiListResponse<ProductItem>;
      const foundInAdmin = (adminListJson.data || []).some((p) => p.slug === 'ec-a-meja-draft' && p.status === 'draft');
      expect(foundInAdmin).toBeTruthy();
    }
  });

  test('2. Filter URL katalog (urut, harga, atribut, sale)', async ({ request, page }) => {
    // 1. Filter URL urut harga naik (?urut=price_asc)
    const ascRes = await request.get(`${API_URL}/api/v1/products?category=workspace&sort=price_asc&limit=10`);
    expect(ascRes.ok()).toBeTruthy();
    const ascJson = (await ascRes.json()) as ApiListResponse<ProductItem>;
    if (ascJson.data && ascJson.data.length >= 2) {
      for (let i = 0; i < ascJson.data.length - 1; i++) {
        expect(ascJson.data[i].price_min).toBeLessThanOrEqual(ascJson.data[i + 1].price_min);
      }
    }

    // 2. Filter URL preset harga (?harga=lt1 -> max_price 999999)
    const priceRes = await request.get(`${API_URL}/api/v1/products?category=workspace&max_price=999999`);
    expect(priceRes.ok()).toBeTruthy();
    const priceJson = (await priceRes.json()) as ApiListResponse<ProductItem>;
    for (const item of (priceJson.data || [])) {
      expect(item.price_min).toBeLessThanOrEqual(999999);
    }

    // 3. Filter URL atribut material (?attrs=material.pine-wood)
    const attrRes = await request.get(`${API_URL}/api/v1/products?attrs=material.pine-wood&limit=10`);
    expect(attrRes.ok()).toBeTruthy();
    const attrJson = (await attrRes.json()) as ApiListResponse<ProductItem>;
    expect(attrJson.data.length).toBeGreaterThan(0);

    // 4. Web UI: Halaman kategori merespons URL filter
    await page.goto(`${WEB_URL}/categories/living-room?urut=price_asc`);
    await expect(page).toHaveURL(/urut=price_asc/);
    await expect(page.locator('h1')).toBeVisible();

    // Verifikasi FilterBar elemen muncul di UI
    const filterBar = page.locator('button:has-text("< 1 jt"), button:has-text("Termurah")');
    if (await filterBar.count() > 0) {
      await expect(filterBar.first()).toBeVisible();
    }
  });

  test('3. Harga coret dan badge sale pada produk diskon', async ({ request, page }) => {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    // Buat produk berstatus published dengan varian sale aktif
    const saleProd = await restInsert(request, 'products', {
      slug: 'ec-a-sofa-sale',
      name: 'Sofa Promo EC-A',
      name_i18n: { en: 'Promo Sofa EC-A', id: 'Sofa Promo EC-A' },
      category_slug: 'living-room',
      description: 'Sofa ruang santai promo',
      status: 'published',
      published_at: yesterday,
      materials: ['polyester fabric'],
      dimensions: { width_cm: 180, depth_cm: 85, height_cm: 80 },
      weight_kg: 25,
    });
    expect(saleProd).not.toBeNull();

    if (saleProd) {
      await restInsert(request, 'product_variants', {
        product_id: saleProd.id,
        sku: 'ECA-SLE-001',
        color: 'grey',
        price: 2500000,
        sale_price: 1900000,
        sale_starts_at: yesterday,
        sale_ends_at: nextWeek,
        stock: 8,
        is_active: true,
      });

      await restInsert(request, 'product_images', {
        product_id: saleProd.id,
        storage_path: 'products/tamu-sofa-1.jpg',
        alt: 'Sofa Promo EC-A',
        is_primary: true,
      });
    }

    // 1. API: GET /api/v1/products/ec-a-sofa-sale menyajikan on_sale=true, price_min=1900000, regular_price_min=2500000
    const detailRes = await request.get(`${API_URL}/api/v1/products/ec-a-sofa-sale`);
    expect(detailRes.ok()).toBeTruthy();
    const detailJson = (await detailRes.json()) as { data: ProductDetail };
    expect(detailJson.data.on_sale).toBeTruthy();
    expect(detailJson.data.price_min).toBe(1900000);
    expect(detailJson.data.regular_price_min).toBe(2500000);

    // 2. Web UI: PDP menampilkan harga efektif dan harga coret (line-through)
    await page.goto(`${WEB_URL}/products/ec-a-sofa-sale`);
    await expect(page.locator('h1')).toContainText('Sofa Promo EC-A');
    // Memeriksa keberadaan harga coret (komponen PriceTag mencakup line-through jika regularPrice > price)
    const crossedPrice = page.locator('.line-through');
    await expect(crossedPrice).toBeVisible();
    await expect(crossedPrice).toContainText(/2\.500\.000/);

    // 3. Web UI: Di kartu produk pada listing, badge SALE tampil
    await page.goto(`${WEB_URL}/categories/living-room?sale=1`);
    const saleCard = page.locator('text=Sofa Promo EC-A').first();
    if (await saleCard.isVisible()) {
      await expect(page.locator('text=SALE').first()).toBeVisible();
    }
  });

  test('4. Produk arsip tidak muncul di publik tapi tampil di admin', async ({ request, page }) => {
    // Buat produk published awal
    const arcProd = await restInsert(request, 'products', {
      slug: 'ec-a-lemari-arsip',
      name: 'Lemari Arsip EC-A',
      name_i18n: { en: 'Archive Cabinet EC-A', id: 'Lemari Arsip EC-A' },
      category_slug: 'storage',
      description: 'Lemari yang diarsipkan',
      status: 'published',
      published_at: new Date().toISOString(),
      materials: ['steel'],
      dimensions: { width_cm: 90, depth_cm: 45, height_cm: 120 },
      weight_kg: 20,
    });
    expect(arcProd).not.toBeNull();

    if (arcProd) {
      await restInsert(request, 'product_variants', {
        product_id: arcProd.id,
        sku: 'ECA-ARC-001',
        color: 'black',
        price: 3000000,
        stock: 4,
        is_active: true,
      });

      await restInsert(request, 'product_images', {
        product_id: arcProd.id,
        storage_path: 'products/wira-bookshelf-1.jpg',
        alt: 'Lemari Arsip EC-A',
        is_primary: true,
      });

      // Ubah status produk menjadi 'archived' lewat admin PUT endpoint
      if (adminJwt) {
        const updateRes = await request.put(`${API_URL}/api/v1/admin/products/${arcProd.id}`, {
          headers: { Authorization: `Bearer ${adminJwt}`, 'Content-Type': 'application/json' },
          data: { status: 'archived' },
        });
        expect(updateRes.ok()).toBeTruthy();
      } else {
        await restUpdate(request, 'products', `id=eq.${arcProd.id}`, { status: 'archived' });
      }
    }

    // 1. Publik: GET /api/v1/products?q=ec-a-lemari-arsip TIDAK memunculkan produk terarsip
    const pubListRes = await request.get(`${API_URL}/api/v1/products?q=ec-a-lemari-arsip`);
    expect(pubListRes.ok()).toBeTruthy();
    const pubListJson = (await pubListRes.json()) as ApiListResponse<ProductItem>;
    const foundInPublic = (pubListJson.data || []).some((p) => p.slug === 'ec-a-lemari-arsip');
    expect(foundInPublic).toBeFalsy();

    // 2. Publik: GET /api/v1/products/ec-a-lemari-arsip mengembalikan 404
    const pubDetailRes = await request.get(`${API_URL}/api/v1/products/ec-a-lemari-arsip`);
    expect(pubDetailRes.status()).toBe(404);

    // 3. Web UI: Navigasi publik ke /products/ec-a-lemari-arsip menampilkan state tidak ditemukan
    await page.goto(`${WEB_URL}/products/ec-a-lemari-arsip`);
    await expect(page.getByText('Lemari Arsip EC-A')).not.toBeVisible();
    await expect(page.getByText('Produk tidak ditemukan')).toBeVisible({ timeout: 15000 });

    // 4. Admin API: GET /api/v1/admin/products?status=archived memunculkan produk terarsip
    if (adminJwt) {
      const adminArcRes = await request.get(`${API_URL}/api/v1/admin/products?status=archived&q=ec-a-lemari-arsip`, {
        headers: { Authorization: `Bearer ${adminJwt}` },
      });
      expect(adminArcRes.ok()).toBeTruthy();
      const adminArcJson = (await adminArcRes.json()) as ApiListResponse<ProductItem>;
      const foundInAdmin = (adminArcJson.data || []).some((p) => p.slug === 'ec-a-lemari-arsip' && p.status === 'archived');
      expect(foundInAdmin).toBeTruthy();
    }
  });
});
