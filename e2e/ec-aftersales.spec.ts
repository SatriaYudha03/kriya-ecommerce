import { test, expect, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'child_process';

const API_URL = process.env.API_URL || 'http://localhost:8084';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nmlhpeqpahihfwzbqmzp.supabase.co';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tbGhwZXFwYWhpaGZ3emJxbXpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMwNDMwMywiZXhwIjoyMDk4ODgwMzAzfQ.JB3UXTwMTeIL3y_6G2F_5HA2zKnG-AUQ2BGND_nPcy4';

const REST = `${supabaseUrl}/rest/v1`;

let userJwt = '';
let adminJwt = '';

const customerUserId = 'dbe43dec-0ed9-413e-a87c-7013c66da2bc';
const adminUserId = 'dfdcd5c8-3403-41fc-920c-5377a32ca907';

let variantId = '';
let productId = '';
let productSlug = '';

// Test Order IDs
const ORDER_PAGINATE_1 = '00000000-0000-0000-0000-0000000000d1';
const ORDER_PAGINATE_2 = '00000000-0000-0000-0000-0000000000d2';
const ORDER_PAGINATE_3 = '00000000-0000-0000-0000-0000000000d3';
const ORDER_CANCEL = '00000000-0000-0000-0000-0000000000d4';
const ORDER_LIFECYCLE = '00000000-0000-0000-0000-0000000000d5';
const ORDER_REVIEW = '00000000-0000-0000-0000-0000000000d6';
const ORDER_RETURN = '00000000-0000-0000-0000-0000000000d7';

const ALL_TEST_ORDERS = [
  ORDER_PAGINATE_1,
  ORDER_PAGINATE_2,
  ORDER_PAGINATE_3,
  ORDER_CANCEL,
  ORDER_LIFECYCLE,
  ORDER_REVIEW,
  ORDER_RETURN,
];

interface RestRow {
  id: string;
  slug?: string;
  product_id?: string;
  stock?: number;
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

async function cleanupTestData(request: APIRequestContext) {
  const orderList = ALL_TEST_ORDERS.join(',');
  await restDelete(request, 'notifications', `user_id=eq.${customerUserId}`);
  await restDelete(request, 'product_reviews', `user_id=eq.${customerUserId}`);
  await restDelete(request, 'refund_items', `refund_id=neq.00000000-0000-0000-0000-000000000000`);
  await restDelete(request, 'refunds', `order_id=in.(${orderList})`);
  await restDelete(request, 'return_request_items', `return_id=neq.00000000-0000-0000-0000-000000000000`);
  await restDelete(request, 'return_requests', `order_id=in.(${orderList})`);
  await restDelete(request, 'order_notes', `order_id=in.(${orderList})`);
  await restDelete(request, 'order_events', `order_id=in.(${orderList})`);
  await restDelete(request, 'order_items', `order_id=in.(${orderList})`);
  await restDelete(request, 'orders', `id=in.(${orderList})`);
}

test.beforeAll(async ({ request }) => {
  // Mint JWT tokens for customer and admin
  userJwt = execFileSync(
    'go',
    ['run', 'main.go', '-email', 'ec-d@kriya.test'],
    { cwd: 'C:\\Porto\\kriya-wt\\agent-d\\scripts\\ec-v2\\mintjwt', encoding: 'utf8' }
  ).trim().split('\n').pop() ?? '';

  adminJwt = execFileSync(
    'go',
    ['run', 'main.go', '-email', 'admin@kriya.com'],
    { cwd: 'C:\\Porto\\kriya-wt\\agent-d\\scripts\\ec-v2\\mintjwt', encoding: 'utf8' }
  ).trim().split('\n').pop() ?? '';

  // Retrieve an active product & variant
  const variants = await restSelect(request, 'product_variants', 'id,product_id,stock', 'limit=1');
  if (variants[0]) {
    variantId = variants[0].id;
    productId = variants[0].product_id ?? '';
    const prods = await restSelect(request, 'products', 'id,slug', `id=eq.${productId}`);
    if (prods[0]) {
      productSlug = prods[0].slug ?? '';
    }
  }

  // Ensure customer profile has full_name set
  await request.patch(`${REST}/profiles?id=eq.${customerUserId}`, {
    headers: {
      apikey: supabaseServiceRole,
      Authorization: `Bearer ${supabaseServiceRole}`,
      'Content-Type': 'application/json',
    },
    data: { full_name: 'Satria D.' },
  });

  // Clean any previous test data
  await cleanupTestData(request);

  // Common seed helper
  const seedOrder = async (id: string, orderNumber: string, status: string, total = 500000) => {
    await restUpsert(request, 'orders', {
      id,
      order_number: orderNumber,
      user_id: customerUserId,
      status,
      subtotal: total,
      total,
      shipping_cost: 0,
      shipping_discount: 0,
      shipping_zone: 'jawa_bali',
      shipping_address: {
        recipient: 'Satria D.',
        phone: '08123456789',
        address_line: 'Jl. Merdeka No. 10',
        city: 'Bandung',
        province: 'Jawa Barat',
        postal_code: '40115',
      },
      created_at: new Date().toISOString(),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    }, 'id');

    await restUpsert(request, 'order_items', {
      id: id, // reuse order ID as item ID for predictable testing
      order_id: id,
      variant_id: variantId,
      product_id: productId,
      name: 'TARU Work Desk',
      sku: 'TARU-WD-NAT',
      qty: 1,
      price: total,
      subtotal: total,
      discount_amount: 0,
      refunded_qty: 0,
    }, 'id');
  };

  // Seed 3 orders for pagination
  await seedOrder(ORDER_PAGINATE_1, 'ECD-PAG-1', 'pending_payment');
  await seedOrder(ORDER_PAGINATE_2, 'ECD-PAG-2', 'processing');
  await seedOrder(ORDER_PAGINATE_3, 'ECD-PAG-3', 'completed');

  // Seed order for cancellation
  await seedOrder(ORDER_CANCEL, 'ECD-CAN-1', 'pending_payment');

  // Seed order for admin lifecycle
  await seedOrder(ORDER_LIFECYCLE, 'ECD-LIFE-1', 'paid');

  // Seed order for reviews
  await seedOrder(ORDER_REVIEW, 'ECD-REV-1', 'completed');

  // Seed order for return & refund
  await seedOrder(ORDER_RETURN, 'ECD-RET-1', 'completed');
});

test.afterAll(async ({ request }) => {
  await cleanupTestData(request);
});

test.describe('D7 - E2E Aftersales', () => {
  test('1. Guard login riwayat pesanan (401 Unauthorized tanpa token)', async ({ request }) => {
    const unauthRes = await request.get(`${API_URL}/api/v1/orders`);
    expect(unauthRes.status()).toBe(401);

    const authedRes = await request.get(`${API_URL}/api/v1/orders`, {
      headers: { Authorization: `Bearer ${userJwt}` },
    });
    expect(authedRes.status()).toBe(200);
    const body = await authedRes.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('2. Paginasi riwayat pesanan (page, limit, meta)', async ({ request }) => {
    const headers = { Authorization: `Bearer ${userJwt}` };

    const page1Res = await request.get(`${API_URL}/api/v1/orders?page=1&limit=2`, { headers });
    expect(page1Res.status()).toBe(200);
    const page1 = await page1Res.json();
    expect(page1.data.length).toBeLessThanOrEqual(2);
    expect(page1.meta).toBeDefined();
    expect(page1.meta.page).toBe(1);
    expect(page1.meta.limit).toBe(2);
    expect(page1.meta.total).toBeGreaterThanOrEqual(3);

    const page2Res = await request.get(`${API_URL}/api/v1/orders?page=2&limit=2`, { headers });
    expect(page2Res.status()).toBe(200);
    const page2 = await page2Res.json();
    expect(page2.meta.page).toBe(2);
    expect(page2.data.length).toBeGreaterThanOrEqual(1);

    // Verify filter by status works
    const filterRes = await request.get(`${API_URL}/api/v1/orders?status=completed`, { headers });
    expect(filterRes.status()).toBe(200);
    const filterBody = await filterRes.json();
    for (const ord of filterBody.data) {
      expect(ord.status).toBe('completed');
    }
  });

  test('3. Batal pesanan oleh customer (pending_payment -> cancelled)', async ({ request }) => {
    const userHeaders = { Authorization: `Bearer ${userJwt}` };

    // Cancel valid pending_payment order
    const cancelRes = await request.post(`${API_URL}/api/v1/orders/${ORDER_CANCEL}/cancel`, {
      headers: userHeaders,
      data: { reason: '[ec-d] Berubah pikiran' },
    });
    expect(cancelRes.status()).toBe(200);

    // Check detail status has updated to cancelled
    const detailRes = await request.get(`${API_URL}/api/v1/orders/${ORDER_CANCEL}`, {
      headers: userHeaders,
    });
    expect(detailRes.status()).toBe(200);
    const detail = (await detailRes.json()).data;
    expect(detail.status).toBe('cancelled');
    expect(detail.can_cancel).toBe(false);

    // Timeline must record cancellation
    const cancelEvent = detail.timeline.find((t: { status: string }) => t.status === 'cancelled');
    expect(cancelEvent).toBeDefined();
    expect(cancelEvent.note).toContain('[ec-d]');

    // Cancelling a completed order must fail with 409 Conflict
    const invalidCancelRes = await request.post(`${API_URL}/api/v1/orders/${ORDER_REVIEW}/cancel`, {
      headers: userHeaders,
      data: { reason: '[ec-d] Coba batal order selesai' },
    });
    expect(invalidCancelRes.status()).toBe(409);
  });

  test('4. Alur admin processing -> shipped -> completed + timeline', async ({ request }) => {
    const adminHeaders = { Authorization: `Bearer ${adminJwt}` };
    const userHeaders = { Authorization: `Bearer ${userJwt}` };

    // 1. Transition paid -> processing
    const procRes = await request.put(`${API_URL}/api/v1/admin/orders/${ORDER_LIFECYCLE}/status`, {
      headers: adminHeaders,
      data: { status: 'processing', note: '[ec-d] Pesanan mulai dikemas' },
    });
    expect(procRes.status()).toBe(200);

    // 2. Transition processing -> shipped with courier & resi
    const shipRes = await request.put(`${API_URL}/api/v1/admin/orders/${ORDER_LIFECYCLE}/status`, {
      headers: adminHeaders,
      data: {
        status: 'shipped',
        courier: 'JNE',
        tracking_number: 'JNE-ECD-998877',
        note: '[ec-d] Dikirim via JNE',
      },
    });
    expect(shipRes.status()).toBe(200);

    // 3. Add order note visible to customer
    const noteRes = await request.post(`${API_URL}/api/v1/admin/orders/${ORDER_LIFECYCLE}/notes`, {
      headers: adminHeaders,
      data: {
        body: '[ec-d] Estimasi tiba 2 hari kerja',
        is_customer_visible: true,
      },
    });
    expect(noteRes.status()).toBe(201);

    // 4. Transition shipped -> completed
    const compRes = await request.put(`${API_URL}/api/v1/admin/orders/${ORDER_LIFECYCLE}/status`, {
      headers: adminHeaders,
      data: { status: 'completed', note: '[ec-d] Paket diterima pembeli' },
    });
    expect(compRes.status()).toBe(200);

    // 5. Customer verifies detail, resi, notes, and timeline
    const customerDetailRes = await request.get(`${API_URL}/api/v1/orders/${ORDER_LIFECYCLE}`, {
      headers: userHeaders,
    });
    expect(customerDetailRes.status()).toBe(200);
    const orderData = (await customerDetailRes.json()).data;

    expect(orderData.status).toBe('completed');
    expect(orderData.courier).toBe('JNE');
    expect(orderData.tracking_number).toBe('JNE-ECD-998877');

    // Verify notes contain the note
    const visibleNote = orderData.notes.find((n: { body: string }) => n.body.includes('[ec-d]'));
    expect(visibleNote).toBeDefined();

    // Verify timeline has processing, shipped, and completed
    const timelineStatuses = orderData.timeline.map((t: { status: string }) => t.status);
    expect(timelineStatuses).toContain('processing');
    expect(timelineStatuses).toContain('shipped');
    expect(timelineStatuses).toContain('completed');
  });

  test('5. Ulasan produk + moderasi admin (buat, edit, moderasi, publik, summary)', async ({ request }) => {
    const userHeaders = { Authorization: `Bearer ${userJwt}` };
    const adminHeaders = { Authorization: `Bearer ${adminJwt}` };

    // Check reviewable items
    const reviewablesRes = await request.get(`${API_URL}/api/v1/me/reviewables`, { headers: userHeaders });
    expect(reviewablesRes.status()).toBe(200);

    // Create review
    const createReviewRes = await request.post(`${API_URL}/api/v1/reviews`, {
      headers: userHeaders,
      data: {
        order_item_id: ORDER_REVIEW,
        rating: 5,
        title: '[ec-d] Sangat Bagus dan Kokoh',
        body: '[ec-d] Meja kerja sangat memuaskan, kayu jati berkualitas tinggi.',
      },
    });
    expect(createReviewRes.status()).toBe(201);
    const createdReview = (await createReviewRes.json()).data;
    expect(createdReview.rating).toBe(5);
    expect(createdReview.status).toBe('pending');

    // Customer can edit review
    const editReviewRes = await request.put(`${API_URL}/api/v1/reviews/${createdReview.id}`, {
      headers: userHeaders,
      data: {
        rating: 4,
        title: '[ec-d] Cukup Puas',
        body: '[ec-d] Bagus sekali hanya saja perakitan butuh waktu.',
      },
    });
    expect(editReviewRes.status()).toBe(200);
    const editedReview = (await editReviewRes.json()).data;
    expect(editedReview.rating).toBe(4);

    // Customer checks my reviews
    const myReviewsRes = await request.get(`${API_URL}/api/v1/me/reviews`, { headers: userHeaders });
    expect(myReviewsRes.status()).toBe(200);
    const myReviews = (await myReviewsRes.json()).data;
    expect(myReviews.some((r: { id: string }) => r.id === createdReview.id)).toBe(true);

    // Admin sees pending review and approves with reply
    const adminReviewsRes = await request.get(`${API_URL}/api/v1/admin/reviews?status=pending`, {
      headers: adminHeaders,
    });
    expect(adminReviewsRes.status()).toBe(200);

    const approveRes = await request.put(`${API_URL}/api/v1/admin/reviews/${createdReview.id}`, {
      headers: adminHeaders,
      data: {
        status: 'approved',
        admin_reply: '[ec-d] Terima kasih telah berbelanja di KRIYA!',
      },
    });
    expect(approveRes.status()).toBe(200);
    const approved = (await approveRes.json()).data;
    expect(approved.status).toBe('approved');
    expect(approved.admin_reply).toContain('[ec-d]');

    // Public product reviews must now include the approved review
    if (productSlug) {
      const publicReviewsRes = await request.get(`${API_URL}/api/v1/products/${productSlug}/reviews`);
      expect(publicReviewsRes.status()).toBe(200);
      const publicReviews = (await publicReviewsRes.json()).data;
      const found = publicReviews.find((r: { id: string }) => r.id === createdReview.id);
      expect(found).toBeDefined();
      expect(found.admin_reply).toContain('[ec-d]');

      // Public summary must return ratings
      const summaryRes = await request.get(`${API_URL}/api/v1/products/${productSlug}/reviews/summary`);
      expect(summaryRes.status()).toBe(200);
      const summary = (await summaryRes.json()).data;
      expect(summary.total_reviews).toBeGreaterThanOrEqual(1);
    }
  });

  test('6. Retur -> Refund -> Stok kembali', async ({ request }) => {
    const userHeaders = { Authorization: `Bearer ${userJwt}` };
    const adminHeaders = { Authorization: `Bearer ${adminJwt}` };

    // 1. Customer creates return request
    const createReturnRes = await request.post(`${API_URL}/api/v1/orders/${ORDER_RETURN}/returns`, {
      headers: userHeaders,
      data: {
        items: [{ order_item_id: ORDER_RETURN, qty: 1 }],
        reason_code: 'damaged',
        description: '[ec-d] Ada goresan di permukaan meja',
      },
    });
    expect(createReturnRes.status()).toBe(201);
    const returnData = (await createReturnRes.json()).data;
    expect(returnData.status).toBe('requested');
    expect(returnData.reason_code).toBe('damaged');

    // 2. Customer views return list
    const myReturnsRes = await request.get(`${API_URL}/api/v1/returns`, { headers: userHeaders });
    expect(myReturnsRes.status()).toBe(200);
    const myReturns = (await myReturnsRes.json()).data;
    expect(myReturns.some((r: { id: string }) => r.id === returnData.id)).toBe(true);

    // 3. Admin lists returns
    const adminReturnsRes = await request.get(`${API_URL}/api/v1/admin/returns`, { headers: adminHeaders });
    expect(adminReturnsRes.status()).toBe(200);

    // 4. Admin approves return
    const approveReturnRes = await request.put(`${API_URL}/api/v1/admin/returns/${returnData.id}`, {
      headers: adminHeaders,
      data: {
        status: 'approved',
        admin_note: '[ec-d] Silakan kirim kembali barang ke alamat gudang',
      },
    });
    expect(approveReturnRes.status()).toBe(200);

    // 5. Admin marks return received
    const receiveReturnRes = await request.put(`${API_URL}/api/v1/admin/returns/${returnData.id}`, {
      headers: adminHeaders,
      data: {
        status: 'received',
        admin_note: '[ec-d] Barang telah sampai di gudang dan diperiksa',
      },
    });
    expect(receiveReturnRes.status()).toBe(200);

    // 6. Check stock before refund
    const varBefore = await restSelect(request, 'product_variants', 'id,stock', `id=eq.${variantId}`);
    const stockBefore = varBefore[0]?.stock ?? 0;

    // 7. Admin creates refund with restock: true and return_id
    const refundRes = await request.post(`${API_URL}/api/v1/admin/orders/${ORDER_RETURN}/refunds`, {
      headers: adminHeaders,
      data: {
        items: [{ order_item_id: ORDER_RETURN, qty: 1 }],
        shipping_amount: 0,
        reason: '[ec-d] Refund retur barang cacat',
        restock: true,
        return_id: returnData.id,
      },
    });
    expect(refundRes.status()).toBe(201);
    const refundData = (await refundRes.json()).data;
    expect(refundData.restock).toBe(true);

    // 8. Verify stock was restored (+1)
    const varAfter = await restSelect(request, 'product_variants', 'id,stock', `id=eq.${variantId}`);
    const stockAfter = varAfter[0]?.stock ?? 0;
    expect(stockAfter).toBe(stockBefore + 1);

    // 9. Verify return status transitioned to 'refunded'
    const finalReturnRes = await request.get(`${API_URL}/api/v1/returns/${returnData.id}`, {
      headers: userHeaders,
    });
    expect(finalReturnRes.status()).toBe(200);
    const finalReturn = (await finalReturnRes.json()).data;
    expect(finalReturn.status).toBe('refunded');

    // 10. Verify order status transitioned to 'refunded'
    const finalOrderRes = await request.get(`${API_URL}/api/v1/orders/${ORDER_RETURN}`, {
      headers: userHeaders,
    });
    expect(finalOrderRes.status()).toBe(200);
    const finalOrder = (await finalOrderRes.json()).data;
    expect(finalOrder.status).toBe('refunded');
  });

  test('7. Notifikasi in-app (daftar, unread count, tandai dibaca)', async ({ request }) => {
    const userHeaders = { Authorization: `Bearer ${userJwt}` };
    const adminHeaders = { Authorization: `Bearer ${adminJwt}` };

    // Ensure at least one notification exists by adding a customer-visible note
    await request.post(`${API_URL}/api/v1/admin/orders/${ORDER_LIFECYCLE}/notes`, {
      headers: adminHeaders,
      data: {
        body: '[ec-d] Notifikasi pesanan Anda telah diperbarui',
        is_customer_visible: true,
      },
    });

    // Get notifications
    const notifsRes = await request.get(`${API_URL}/api/v1/notifications`, { headers: userHeaders });
    expect(notifsRes.status()).toBe(200);
    const notifsBody = await notifsRes.json();
    expect(Array.isArray(notifsBody.data)).toBe(true);
    expect(notifsBody.data.length).toBeGreaterThan(0);

    // Unread count must be > 0
    const countRes = await request.get(`${API_URL}/api/v1/notifications/unread-count`, { headers: userHeaders });
    expect(countRes.status()).toBe(200);
    const countBody = await countRes.json();
    expect(countBody.data.count).toBeGreaterThan(0);

    // Mark all as read
    const markReadRes = await request.post(`${API_URL}/api/v1/notifications/read`, {
      headers: userHeaders,
      data: { all: true },
    });
    expect(markReadRes.status()).toBe(200);

    // Check unread count is now 0
    const countAfterRes = await request.get(`${API_URL}/api/v1/notifications/unread-count`, { headers: userHeaders });
    expect(countAfterRes.status()).toBe(200);
    const countAfter = await countAfterRes.json();
    expect(countAfter.data.count).toBe(0);
  });
});
