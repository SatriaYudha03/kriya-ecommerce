# Eksekusi Paralel KRIYA E-commerce v2 — 4 agent opencode + Claude

**Status:** 🟡 **RENCANA — belum dieksekusi.**
**Tanggal:** 2026-09-24 · **Pemilik:** Satria
**Pasangan:** `docs/rencana/RENCANA-ECOMMERCE-V2.md` (disingkat **RENCANA**) adalah sumber kebenaran untuk **apa** yang dibangun: skema §5, aturan bisnis §6, kontrak API §7. Dokumen ini sumber kebenaran untuk **siapa, kapan, di file mana, dan lewat antarmuka apa**.

---

## 0. Cara pakai

**Agent opencode:** di awal setiap sesi, baca berurutan:
1. `docs/agents/KRIYA-MASTER.md` Bagian 5 (konvensi, larangan `any`) dan Bagian 10 (larangan global). **Bagian 3 (teritori FE/BE) dan Bagian 8 (ritual push langsung ke main) DIGANTIKAN oleh dokumen ini selama program EC-v2.**
2. Dokumen ini: §0–§5 (aturan, kepemilikan, antarmuka), lalu **hanya** bagian task-mu (§6/§7/§8/§9).
3. Bagian RENCANA yang dirujuk task-mu.
4. `docs/ec-v2/LOG-<kamu>.md` untuk mengetahui posisi terakhir.

**Claude (reviewer/integrator):** §10 (protokol permintaan), §11 (checklist review & merge), §12 (prompt peluncuran).

**Satria:** gerbang G0–G3 (§6.5, §7.5, §8.4, §9.3). Keputusan pra-F0 (RENCANA §11 O1–O4) sudah dikunci 2026-09-24.

Istilah: **Agent A** = Katalog & Inventori · **Agent B** = Customer & Checkout · **Agent C** = Promo & Laporan · **Agent D** = After-sales · **core** = kode bersama yang dibekukan setelah G0 · **integrator** = agent yang ditunjuk untuk F2 · 🔒 = kontrak lintas agent (beku).

---

## 1. Peta fase

```
          ┌──────────── F0 FONDASI ─────────────┐        ┌──────────── F1 DOMAIN ────────────┐
          │ 0D-1 golden snapshot (harus duluan) │        │ A: A1 → A2 → A3 → A4 → A5 → A6 → A7│
 main ──► │ 0A SQL 008–012 ─┐                   │ ─ G0 ─►│ B: B1 → B2 → B3 → B4 → B5 → B6 → B7│ ─ G1 ─┐
          │ 0B Go refactor ─┼─ paralel          │        │ C: C1 → C2 → C3 → C4 → C5 → C6     │       │
          │ 0C FE refactor ─┤                   │        │ D: D1 → D2 → D3 → D4 → D5 → D6 → D7│       │
          │ 0D tooling ─────┘                   │        └── 4 agent PARALEL PENUH ───────────┘       │
          └─────────────────────────────────────┘                                                    │
   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┘
   │   ┌──────── F2 INTEGRASI ────────┐        ┌──────── F3 PENGERASAN ─────────┐
   └──►│ I-BE ─┐ paralel              │ ─ G2 ─►│ A/B/C/D: seed demo, e2e, audit │ ─ F3-Z (sekuensial: 013 cleanup,
       │ I-FE ─┘                      │        │ i18n/a11y/perf (paralel)       │   update KRIYA-MASTER) ─ G3
       │ I-QA  (sekuensial, setelah)  │        └────────────────────────────────┘
       └──────────────────────────────┘
```

| Fase | Paralel? | Kenapa |
|---|---|---|
| **F0** | **Sebagian.** 0D-1 dulu (±30 menit), lalu 0A/0B/0C/0D paralel. 0B butuh SQL 0A untuk uji lokal, jadi mulai menulis paralel dan uji setelah 0A selesai | Semua yang dipakai bersama dibuat & dibekukan di sini: skema, antarmuka Go (port), struktur modul FE, stub komponen lintas domain, i18n per domain. Tanpa F0, 4 agent pasti bertabrakan di `main.go`, `lib/types.ts`, `messages/id.ts`, `model/response.go` |
| **G0** | Sekuensial (Claude + Satria) | Migrasi diterapkan ke DB dev satu kali, oleh satu pihak |
| **F1** | **Paralel penuh 4 agent** | Setiap agent hanya menulis di package/folder domainnya; interaksi lintas domain lewat port (Go) dan stub komponen (FE) yang sudah beku; tidak ada DDL |
| **F2** | I-BE ∥ I-FE, lalu I-QA | Checkout = satu-satunya jalur yang menyentuh keempat domain sekaligus. Kontraknya (RENCANA §7.6) beku sejak G0, jadi BE & FE bisa paralel; E2E penuh harus setelah keduanya masuk |
| **F3** | Paralel, ditutup F3-Z sekuensial | Pekerjaan per domain lagi; pembersihan skema destruktif hanya sekali di akhir |

Perkiraan sesi (1 sesi = 1 task): F0 ≈ 1–2 sesi per agent · F1 ≈ 6–7 sesi per agent · F2 ≈ 2 + 1 · F3 ≈ 2 per agent + 1.

---

## 2. Aturan main

| # | Aturan |
|---|---|
| R1 | **Kepemilikan file (§3) menggantikan teritori FE/BE.** Agent boleh menulis di Go **dan** FE, tetapi hanya file yang cocok dengan polanya. File tanpa pemilik di §3 = core = **dilarang disentuh** |
| R2 | **Satu worktree per agent.** `git worktree add C:\Porto\kriya-wt\agent-a -b ec/A1-status-produk main` (dan seterusnya). Dua agent di satu folder = dilarang |
| R3 | **Branch per task** `ec/<ID>-<slug>` dari `main` terbaru (`git fetch && git rebase origin/main` sebelum mulai). Agent **push branch**, **tidak pernah merge ke main**; yang merge Claude (§11) |
| R4 | Commit `[ec-A] <ringkas>` (A/B/C/D/0A/0B/0C/0D/I). Body commit memuat contoh `curl` endpoint yang disentuh |
| R5 | **Tidak ada DDL di F1 dan F2.** Butuh kolom/tabel/index → permintaan (§10). Migrasi 013+ hanya ditulis Claude/Satria di gerbang |
| R6 | **Port Go & stub FE beku sejak G0** (§4, §5). Pemilik mengisi implementasinya, tapi **tidak mengubah signature**. Konsumen hanya memakai lewat antarmuka itu |
| R7 | **Kontrak 🔒 hanya boleh berubah aditif.** Menghapus/mengubah tipe field 🔒 = permintaan. Satu-satunya breaking change yang direncanakan: `GET /orders` (D1, BE+FE dalam satu commit) dan `POST /orders` (I-BE+I-FE di F2) |
| R8 | **Go: satu package per domain** (`internal/catalog`, `internal/customer`, `internal/promo`, `internal/aftersales`). **Dilarang meng-import package domain lain.** Lintas domain hanya lewat `internal/checkout` (port + tipe), `internal/orderflow`, atau SQL **baca-saja** ke tabel domain lain |
| R9 | **Tulis ke DB hanya ke tabel milik domainmu** (RENCANA §5.6). Stok, kupon, dan event order domain lain → lewat port |
| R10 | **FE: import lintas domain hanya dari daftar §5.3** (komponen & hook publik). Kode baru meng-import dari modul domain (`@/lib/catalog/api`), **bukan** dari barrel `@/lib/api` |
| R11 | **i18n: key baru hanya di file domainmu** dengan prefix domain (§5.4). Teks key core yang sudah ada tidak boleh diubah |
| R12 | **DB dev dipakai bersama.** Data uji wajib berprefix (§2.1), hanya mengubah data yang kamu buat sendiri, dan **dibersihkan di akhir sesi**. Dilarang mengubah stok/harga produk seed asli |
| R13 | **Dependency beku:** `go.mod`, `package.json`, lockfile, `components/ui/**`. Butuh library atau komponen shadcn baru → permintaan. Grafik laporan dibuat dengan SVG/CSS, bukan library chart |
| R14 | **Satu task per sesi.** Tutup sesi: DoD §2.2 hijau → commit → push branch → satu baris di `docs/ec-v2/LOG-<X>.md` |
| R15 | Larangan KRIYA-MASTER Bagian 5 & 10 tetap berlaku penuh: tanpa `any`/`as any`/`interface{}`/`map[string]interface{}`/`gin.H` untuk payload, tanpa `eslint-disable`/`@ts-ignore`, tanpa `AutoMigrate` |
| R16 | Next.js di repo ini versi 16 dengan perubahan besar: **baca `apps/web/node_modules/next/dist/docs/`** sebelum menulis routing/middleware/proxy (lihat `apps/web/AGENTS.md`) |
| R17 | Terblokir? Tulis permintaan (§10), **kerjakan bagian task yang tidak terblokir**, laporkan di log. Jangan menambal di luar kepemilikan, jangan diam menunggu |

### 2.1 Lingkungan per agent

| Agent | Worktree | API `PORT` | Web `next dev -p` | `WEB_ORIGIN` | Akun uji | Prefix data uji |
|---|---|---|---|---|---|---|
| A | `C:\Porto\kriya-wt\agent-a` | 8081 | 3001 | `http://localhost:3001` | `ec-a@kriya.test` | slug `ec-a-…`, sku `ECA-…` |
| B | `…\agent-b` | 8082 | 3002 | `http://localhost:3002` | `ec-b@kriya.test` | label alamat `EC-B …`, zona `ec_b_…` |
| C | `…\agent-c` | 8083 | 3003 | `http://localhost:3003` | `ec-c@kriya.test` | kode kupon `ECC-…` |
| D | `…\agent-d` | 8084 | 3004 | `http://localhost:3004` | `ec-d@kriya.test` | catatan/ulasan diawali `[ec-d]` |

`.env` (root) dan `apps/web/.env.local` disalin dari working copy utama (gitignored), lalu `PORT`, `WEB_ORIGIN`, dan `NEXT_PUBLIC_API_URL` disesuaikan. Akun admin `admin@kriya.com` dipakai bersama, **hanya untuk operasi pada data uji milikmu**. Token JWT uji: `go run ./scripts/ec-v2/mintjwt -email ec-a@kriya.test` (dibuat 0D).

### 2.2 Definition of Done (setiap task)
1. `cd services/api && go build ./... && go vet ./... && go test ./...` hijau.
2. `cd apps/web && npx tsc --noEmit` 0 error **dan** `npx eslint .` 0 problem **dan** `npx next build` hijau.
3. `bash scripts/ec-v2/check-ownership.sh <X> origin/main...HEAD` → tidak ada pelanggaran.
4. `bash scripts/ec-v2/any-check.sh` → tidak ada temuan baru.
5. Endpoint baru/diubah dites `curl` terhadap API worktree-mu; bentuk JSON cocok dengan RENCANA §7 (tempel contoh di body commit).
6. Fixtures domain diperbarui byte-per-byte dengan bentuk respons.
7. Teks UI lewat kamus i18n EN **dan** ID.
8. Spec Playwright domainmu (`e2e/ec-<domain>.spec.ts`) bertambah untuk fitur ini dan hijau.
9. Data uji dibersihkan; satu baris log.

---

## 3. Matriks kepemilikan file

Pola glob relatif terhadap root repo. **Yang tidak tercantum = core/beku.** Setelah G0, file core hanya boleh diubah integrator di F2 atau Claude.
Salinan mesin-baca: `scripts/ec-v2/ownership.txt` (dibuat 0D dari tabel ini; kalau berbeda, **tabel ini yang benar**).

### 3.1 Backend (`services/api/`)

| Pemilik | Pola |
|---|---|
| **core** | `cmd/api/**` · `internal/platform/**` · `internal/httpx/**` · `internal/checkout/**` · `internal/orderflow/**` · `internal/service/**` · `internal/middleware/**` · `internal/config/**` · `internal/db/**` · `internal/storage/**` · `go.mod` · `go.sum` · `Dockerfile` |
| **A** | `internal/catalog/**` · `cmd/seed/**` |
| **B** | `internal/customer/**` |
| **C** | `internal/promo/**` |
| **D** | `internal/aftersales/**` |

### 3.2 Frontend (`apps/web/`)

| Pemilik | Pola |
|---|---|
| **core** | `app/layout.tsx` · `app/providers.tsx` · `app/not-found.tsx` · `app/globals.css` · `app/(store)/layout.tsx` · `app/(admin)/layout.tsx` · `app/(auth)/**` · `app/(store)/checkout/**` · `app/(store)/search/**` · `middleware.ts`/`proxy.ts` · `lib/http.ts` · `lib/api.ts` · `lib/types.ts` · `lib/queries.ts` · `lib/admin-queries.ts` · `lib/fixtures/**` · `lib/i18n/index.ts` · `lib/i18n/messages/*/index.ts` · `lib/i18n/messages/*/core.ts` · `lib/i18n/messages/*/checkout.ts` · `lib/checkout/**` · `lib/snap.ts` · `lib/supabase.ts` · `lib/format.ts` · `lib/utils.ts` · `components/ui/**` · `components/kriya/account/**` · `components/kriya/admin/admin-guard.tsx` · `components/kriya/{site-header,site-footer,top-bar,hero,service-features,newsletter,auth-provider,language-provider,social-login-buttons,chat-widget,empty-state,pagination,section-heading}.tsx` · `package.json` · lockfile · `next.config.ts` · `tsconfig.json` · `eslint.config.mjs` · `components.json` |
| **A** | `lib/catalog/**` · `lib/category-meta.ts` · `lib/storage.ts` · `lib/i18n/messages/*/catalog.ts` · `components/kriya/catalog/**` · `components/kriya/{product-card,product-grid,product-detail-view,product-gallery,product-media,product-tabs,product-rail,variant-selector,filter-bar,category-card,category-showcase,category-view,breadcrumbs}.tsx` · `components/kriya/admin/product-form.tsx` · `app/(store)/page.tsx` · `app/(store)/client-product-rails.tsx` · `app/(store)/products/**` · `app/(store)/categories/**` · `app/(admin)/admin/products/**` · `app/(admin)/admin/catalog/**` · `app/(admin)/admin/inventory/**` |
| **B** | `lib/customer/**` · `lib/i18n/messages/*/customer.ts` · `stores/cart-store.ts` · `components/kriya/customer/**` · `app/(store)/cart/**` · `app/(store)/profile/**` · `app/(store)/account/addresses/**` · `app/(store)/account/wishlist/**` · `app/(admin)/admin/customers/**` · `app/(admin)/admin/shipping/**` · `app/(admin)/admin/settings/**` |
| **C** | `lib/promo/**` · `lib/i18n/messages/*/promo.ts` · `components/kriya/promo/**` · `components/kriya/promo-banner.tsx` · `app/(admin)/admin/page.tsx` · `app/(admin)/admin/coupons/**` · `app/(admin)/admin/reports/**` |
| **D** | `lib/aftersales/**` · `lib/i18n/messages/*/aftersales.ts` · `components/kriya/aftersales/**` · `app/(store)/orders/**` · `app/(store)/account/reviews/**` · `app/(store)/account/returns/**` · `app/(store)/account/notifications/**` · `app/(admin)/admin/orders/**` · `app/(admin)/admin/reviews/**` · `app/(admin)/admin/returns/**` |

### 3.3 Lain-lain

| Pemilik | Pola |
|---|---|
| **Selama F0 saja** | 0A: `supabase/migrations/008_*.sql` … `012_*.sql`, `supabase/config.toml` (bila perlu untuk DB lokal) · 0B: seluruh `services/api/**` · 0C: seluruh `apps/web/**` · 0D: `scripts/ec-v2/**`, `docs/ec-v2/**` |
| **Claude/Satria** | `supabase/migrations/013+` · `docs/**` kecuali log · `AGENTS.md` · `CLAUDE.md` · `.github/**` · `helm/**` · `infra/**` · `docker-compose.yml` |
| **0D, lalu Claude** | `scripts/ec-v2/**` |
| **A/B/C/D** | `e2e/ec-catalog.spec.ts` / `ec-customer.spec.ts` / `ec-promo.spec.ts` / `ec-aftersales.spec.ts` · `docs/ec-v2/LOG-A.md` … `LOG-D.md` · (F3) `supabase/seed/ec-v2/{catalog,customer,promo,aftersales}.sql` |
| **Integrator** | `e2e/transaksi.spec.ts` · `e2e/ec-flow.spec.ts` · `docs/ec-v2/LOG-I.md` |
| **Tidak disentuh v2** | `services/ai/**` · `data/**` · `automation/**` · `e2e/{ai-search,chatbot}.spec.ts` |

`e2e/{katalog,admin}.spec.ts` yang sudah ada: A boleh memperbarui `katalog.spec.ts`; `admin.spec.ts` milik D (halaman pesanan admin), dan A/B/C menulis tes admin mereka di spec domain masing-masing.

---

## 4. Kontrak antarmuka Go (dibuat 0B, 🔒 beku sejak G0)

### 4.1 Struktur package setelah F0

```
services/api/
  cmd/api/main.go              core  — config, DB, midtrans, Ports, Routers, panggil RegisterRoutes tiap domain
  internal/httpx/              core  — Response, ListResponse, Meta, ErrorResponse, RespondError, ParsePagination,
                                       ResolveLocale, I18nString, I18nArray, UserID(c), DeletedResponse
  internal/platform/           core  — Deps, Routers
  internal/checkout/           core  — ports.go, types.go, pricing.go (PriceLines), service.go (CreateOrder),
                                       webhook.go, legacy.go (implementasi port lama untuk uji), routes.go
  internal/orderflow/          core  — status.go (konstanta + CanTransition), transition.go (Transition)
  internal/catalog/            A     — handler_*.go, repo_*.go, model_*.go, ledger.go (InventoryLedger), routes.go
  internal/customer/           B     — …, shipping.go (ShippingQuoter), routes.go
  internal/promo/              C     — …, discount.go (DiscountApplier), routes.go
  internal/aftersales/         D     — …, events.go (OrderEventRecorder), routes.go
  internal/{middleware,config,db,storage,service}/   core (sudah ada)
```
Package `handler`, `repository`, `model` lama **dihapus** oleh 0B setelah isinya dipindah.

### 4.2 `internal/platform`

```go
package platform

type Deps struct {
	DB          *gorm.DB
	Cfg         config.Config
	Midtrans    *service.MidtransService
	Ports       checkout.Ports
	SupabaseURL string // untuk storage.PublicURL
}

type Routers struct {
	Public   *gin.RouterGroup // /api/v1
	Authed   *gin.RouterGroup // /api/v1 + Auth
	Admin    *gin.RouterGroup // /api/v1/admin + Auth + Admin
	Internal *gin.RouterGroup // /api/v1/internal + InternalKey
}
```
Setiap domain mengekspor tepat satu `func RegisterRoutes(r platform.Routers, d platform.Deps)` di `internal/<domain>/routes.go`. Rute baru hanya didaftarkan di sana, sesuai registry RENCANA §7.1. **Rute di registry yang bukan milikmu = jangan didaftarkan** (Gin panic saat start bila dobel).

### 4.3 `internal/checkout/ports.go`

```go
package checkout

type LineInput struct {
	VariantID string
	Qty       int
}

// PricedLine: hasil PriceLines — harga efektif sudah dihitung DB (kriya_effective_price).
type PricedLine struct {
	VariantID, ProductID, CategoryID, ProductSlug, SKU string
	Name, Color  string  // sudah dilokalkan
	Size         *string
	ThumbnailURL string
	Qty          int
	UnitPrice    int     // efektif
	RegularPrice int
	OnSale       bool
	WeightKg     float64 // varian ?? produk
	Subtotal     int     // UnitPrice × Qty
}

type Problem struct {
	VariantID string
	Code      string // "insufficient_stock" | "unavailable"
	Available int
}

// PriceLines (pricing.go) — dipakai core, B (cart), C (validasi kupon).
// lock=true: kunci baris varian FOR UPDATE urut variant_id (hanya di transaksi order).
func PriceLines(ctx context.Context, tx *gorm.DB, lines []LineInput, locale string, lock bool) ([]PricedLine, []Problem, error)

// ---------- Ongkir (implementasi: B, internal/customer/shipping.go) ----------
type Destination struct{ ProvinceCode string }

type ShippingOption struct {
	MethodID, ZoneCode, Code, Name string // Name dilokalkan
	Cost                           int
	IsFree                         bool
	EtaMinDays, EtaMaxDays         int
}

type ShippingQuoter interface {
	// Opsi valid untuk tujuan & total berat, urut Cost naik. Provinsi tanpa zona → slice kosong (bukan error).
	Options(ctx context.Context, db *gorm.DB, dest Destination, lines []PricedLine, subtotal int, locale string) ([]ShippingOption, error)
}

// ---------- Kupon (implementasi: C, internal/promo/discount.go) ----------
type CouponReason string

const (
	CouponNotFound          CouponReason = "not_found"
	CouponInactive          CouponReason = "inactive"
	CouponNotStarted        CouponReason = "not_started"
	CouponExpired           CouponReason = "expired"
	CouponUsageLimitReached CouponReason = "usage_limit_reached"
	CouponUserLimitReached  CouponReason = "user_limit_reached"
	CouponNotApplicable     CouponReason = "not_applicable"
	CouponMinSubtotalNotMet CouponReason = "min_subtotal_not_met"
)

type CouponRejectedError struct{ Reason CouponReason }

func (e *CouponRejectedError) Error() string { return "kupon ditolak: " + string(e.Reason) }

type LineDiscount struct {
	VariantID string
	Amount    int
}

type DiscountResult struct {
	CouponID, Code, DiscountType string // percent | fixed_cart | free_shipping
	Description                  string // dilokalkan
	ItemsDiscount                int
	FreeShipping                 bool
	MinSubtotal                  int
	Lines                        []LineDiscount // urutan = urutan input; baris tidak eligible → 0
}

type DiscountApplier interface {
	// Evaluate: baca saja. Ditolak → *CouponRejectedError. lock=true → kunci baris kupon FOR UPDATE.
	Evaluate(ctx context.Context, tx *gorm.DB, userID, code string, lines []PricedLine, locale string, lock bool) (DiscountResult, error)
	Reserve(ctx context.Context, tx *gorm.DB, orderID, userID string, r DiscountResult, shippingDiscount int) error
	Confirm(ctx context.Context, tx *gorm.DB, orderID string) error // reserved→applied; tidak ada → no-op
	Release(ctx context.Context, tx *gorm.DB, orderID string) error // reserved→released; tidak ada/sudah → no-op
}

// ---------- Stok (implementasi: A, internal/catalog/ledger.go) ----------
type InsufficientStockError struct {
	VariantID            string
	Available, Requested int
}

func (e *InsufficientStockError) Error() string { return "stok tidak cukup" }

type RestockItem struct {
	VariantID string
	Qty       int
}

type InventoryLedger interface {
	// Reserve: kunci varian urut variant_id, cek, kurangi, tulis movement order_reserved. Kurang → *InsufficientStockError.
	Reserve(ctx context.Context, tx *gorm.DB, orderID string, lines []LineInput, actorID *string) error
	// Release: kembalikan seluruh qty item order (order_released). IDEMPOTEN.
	Release(ctx context.Context, tx *gorm.DB, orderID string, actorID *string) error
	// Restock: kembalikan sebagian (return_restock), dipakai refund.
	Restock(ctx context.Context, tx *gorm.DB, orderID string, items []RestockItem, actorID *string, note string) error
}

// ---------- Event order (implementasi: D, internal/aftersales/events.go) ----------
type ActorType string

const (
	ActorCustomer       ActorType = "customer"
	ActorAdmin          ActorType = "admin"
	ActorSystem         ActorType = "system"
	ActorPaymentGateway ActorType = "payment_gateway"
)

type OrderEvent struct {
	OrderID        string
	FromStatus     *string
	ToStatus       string
	ActorType      ActorType
	ActorID        *string
	Note           string
	NotifyCustomer bool // true → buat baris notifications (teks dwibahasa, template milik D)
}

type OrderEventRecorder interface {
	Record(ctx context.Context, tx *gorm.DB, e OrderEvent) error
}

type Ports struct {
	Shipping  ShippingQuoter
	Discounts DiscountApplier
	Inventory InventoryLedger
	Events    OrderEventRecorder
}
```

**Wiring (main.go, dibuat 0B, tidak berubah sampai F2):**
```go
ports := checkout.Ports{
	Shipping:  customer.NewShippingQuoter(),
	Discounts: promo.NewDiscountApplier(),
	Inventory: catalog.NewInventoryLedger(),
	Events:    aftersales.NewOrderEventRecorder(),
}
```
Di F0, 0B membuat keempat konstruktor itu di package domain masing-masing dengan **implementasi lama/no-op** (file `ports_legacy.go`): stok = update langsung seperti M2, ongkir = 2 zona flat, kupon = selalu `not_found`, event = no-op. Setelah G0, file itu **milik domainnya**. Pemilik menggantinya dengan implementasi asli di F1, jadi **tidak perlu menyentuh main.go**. Akibatnya: ledger A dan recorder D langsung aktif di jalur checkout/webhook lama begitu di-merge. Itu disengaja (integrasi lebih dini), sehingga tes regresi transaksi wajib ikut dijalankan (§11).

### 4.4 `internal/orderflow` (0B)

```go
package orderflow

type Status string // 8 konstanta: StatusPendingPayment … StatusRefunded

func CanTransition(from, to Status, actor checkout.ActorType) bool // tabel RENCANA §6.1, termasuk kolom aktor

type TransitionInput struct {
	OrderID        string
	To             Status
	Actor          checkout.ActorType
	ActorID        *string
	Note           string
	Courier        *string // wajib bila To = shipped
	TrackingNumber *string
	CancelReason   *string
}

type InvalidTransitionError struct{ From, To Status }       // → handler balas 409
type MissingShipmentInfoError struct{}                        // → handler balas 400

// Transition: kunci baris order FOR UPDATE, validasi, set stempel waktu & kolom,
// jalankan efek samping RENCANA §6.1 lewat ports (Release/Confirm), lalu Events.Record(NotifyCustomer: true).
// Harus dipanggil di dalam transaksi (tx). Tidak memanggil Midtrans.
func Transition(ctx context.Context, tx *gorm.DB, p checkout.Ports, in TransitionInput) (from Status, err error)
```
D memakai `Transition` untuk batal customer, ubah status admin, dan refund penuh. Integrator memakainya di webhook (F2). **Tidak ada domain yang boleh `UPDATE orders SET status` di luar `Transition`.**

### 4.5 `internal/service/midtrans.go` (0B menambah, lalu beku)
- `CreateSnapTransaction(orderID string, amount int, expiryMinutes int) (token string, err error)`: parameter expiry baru; jalur lama memakai `store_settings.pending_payment_ttl_minutes`.
- `CancelTransaction(midtransOrderID string) error`: dipakai D3, best-effort.

---

## 5. Kontrak antarmuka FE (dibuat 0C, 🔒 beku sejak G0)

### 5.1 Struktur modul

```
lib/http.ts                  core  request<T>(), requestList<T>(), ApiError, setAccessTokenGetter, USE_FIXTURES
lib/<domain>/types.ts        tipe kontrak domain (catalog | customer | promo | aftersales)
lib/<domain>/api.ts          fungsi fetch domain — wajib lewat lib/http.ts
lib/<domain>/queries.ts      hook TanStack Query + objek key (catalogKeys, customerKeys, promoKeys, afterKeys)
lib/<domain>/fixtures.ts     fixtures domain
lib/checkout/{types,api,queries,fixtures}.ts   core/integrator (bentuk RENCANA §7.6 sudah ditulis 0C)
lib/snap.ts                  core  loadSnap(clientKey), paySnap(token) → Promise<"success"|"pending"|"error"|"closed">
lib/api.ts, lib/types.ts, lib/queries.ts, lib/admin-queries.ts, lib/fixtures/index.ts
                             core  BARREL: re-export BERNAMA (bukan `export *`) untuk simbol lama saja
```
0C memindahkan isi `lib/api.ts`/`types.ts`/`queries.ts`/`admin-queries.ts`/`fixtures` ke modul domain sesuai pemiliknya (katalog → catalog, cart+profile → customer, orders → aftersales, admin stats → promo, admin produk → catalog, admin orders → aftersales), lalu mengubah file lama menjadi barrel supaya import lama tetap jalan. **Simbol baru tidak pernah ditambahkan ke barrel.**

Query key wajib diawali domain: `["catalog", …]`, `["customer", …]`, `["promo", …]`, `["after", …]`, `["checkout", …]`.

### 5.2 Tipe bersama

`OrderStatus` (8 nilai, termasuk `refunded`) ada di `lib/aftersales/types.ts`; `ProductListItem`/`ProductDetail` di `lib/catalog/types.ts`; `Address` & `Cart` di `lib/customer/types.ts`. Domain lain **meng-import tipe ini, tidak menduplikasinya**. Menambah field opsional di tipe milikmu boleh; mengubah/menghapus field 🔒 = permintaan.

### 5.3 Komponen & hook lintas domain (stub dibuat 0C dengan signature final; isi oleh pemilik di F1)

Stub merender `null` (kecuali `PriceTag` yang merender `formatRupiah(price)`), jadi tampilan tidak berubah sampai pemilik mengisinya. **Konsumen memasang komponen ini sendiri di file miliknya.** 0C hanya memasangnya di file core (header).

| Komponen / hook | Pemilik | Props / signature | Dipakai oleh |
|---|---|---|---|
| `components/kriya/catalog/price-tag.tsx` `PriceTag` | A | `{ price: number; regularPrice?: number \| null; size?: "sm" \| "md" \| "lg" }` | B (cart, wishlist), D (item order), integrator |
| `components/kriya/catalog/rating-stars.tsx` `RatingStars` | A | `{ value: number; count?: number; size?: "sm" \| "md" }` | D (ulasan) |
| `components/kriya/product-card.tsx` `ProductCard` | A | `{ product: ProductListItem }` (**tidak berubah**) | B (wishlist) |
| `components/kriya/customer/wishlist-button.tsx` `WishlistButton` | B | `{ productId: string; variant?: "icon" \| "full" }` | A (kartu, PDP) |
| `components/kriya/customer/wishlist-nav-button.tsx` `WishlistNavButton` | B | `{}` | header (0C memasang) |
| `components/kriya/customer/address-picker.tsx` `AddressPicker` | B | `{ value: string \| null; onChange: (address: Address) => void }` | integrator |
| `components/kriya/customer/shipping-method-picker.tsx` `ShippingMethodPicker` | B | `{ options: QuoteShippingOption[]; value: string \| null; onChange: (methodId: string) => void; loading?: boolean }` (tipe dari `lib/checkout/types.ts`) | integrator |
| `components/kriya/customer/continue-payment-button.tsx` `ContinuePaymentButton` | B | `{ orderId: string; size?: "sm" \| "md"; onSettled?: () => void }` (memakai `lib/snap.ts`) | D (riwayat & detail order) |
| `lib/customer/queries.ts` `useAddresses()`, `customerKeys` | B | `useAddresses(): UseQueryResult<Address[]>` | integrator |
| `components/kriya/promo/coupon-input.tsx` `CouponInput` | C | `{ items: { variant_id: string; qty: number }[]; appliedCode: string \| null; onApplied: (r: CouponValidation) => void; onRemoved: () => void }` | integrator |
| `components/kriya/aftersales/order-status-badge.tsx` `OrderStatusBadge` | D | `{ status: OrderStatus }` | B (detail pelanggan admin), C (dashboard) |
| `components/kriya/aftersales/product-reviews.tsx` `ProductReviews` | D | `{ productSlug: string }` | A (PDP) |
| `components/kriya/aftersales/notification-bell.tsx` `NotificationBell` | D | `{}` | header (0C memasang) |
| `lib/aftersales/queries.ts` `afterKeys` | D | objek key | integrator (invalidate setelah order dibuat) |
| `components/kriya/account/account-nav.tsx` `AccountNav` | core | `{ active: "profile" \| "orders" \| "addresses" \| "wishlist" \| "reviews" \| "returns" \| "notifications" }` | B, D (halaman akun) |

### 5.4 i18n per domain

```
lib/i18n/messages/id/index.ts   core: export const id = { ...coreId, ...catalogId, ...customerId, ...promoId, ...aftersalesId, ...checkoutId }
lib/i18n/messages/id/core.ts    core: SELURUH key lama (dipindah apa adanya)
lib/i18n/messages/id/catalog.ts A    prefix "catalog." dan "adminCatalog."
lib/i18n/messages/id/customer.ts B   prefix "customer." dan "adminCustomer."
lib/i18n/messages/id/promo.ts   C    prefix "promo." dan "adminPromo."
lib/i18n/messages/id/aftersales.ts D prefix "after." dan "adminAfter."
lib/i18n/messages/id/checkout.ts core/integrator prefix "checkoutV2."
lib/i18n/messages/en/*.ts       sama; tiap file: `export const catalogEn: typeof catalogId = { … }` → paritas EN/ID dijaga tsc
```
`MessageKey = keyof typeof id` tetap bekerja. Dua domain tidak mungkin bertabrakan key karena prefix-nya berbeda.

### 5.5 Rute FE yang disiapkan 0C (stub "Segera hadir", lalu milik domain)
- Admin (nav `app/(admin)/layout.tsx` diperbarui 0C + i18n): `/admin/catalog/categories`, `/admin/catalog/tags`, `/admin/catalog/attributes`, `/admin/inventory` (A) · `/admin/customers`, `/admin/shipping`, `/admin/settings` (B) · `/admin/coupons`, `/admin/reports` (C) · `/admin/reviews`, `/admin/returns` (D).
- Akun: `/account/addresses`, `/account/wishlist` (B) · `/account/reviews`, `/account/returns`, `/account/notifications` (D). `/profile` dan `/orders` tetap di path lamanya.
- Guard login (middleware/proxy Next 16, core): `/orders/**`, `/profile`, `/checkout`, `/account/**` → `/login?next=…` bila tanpa sesi.

---

## 6. F0 — Fondasi

### 6.0 Urutan
0D-1 dijalankan **pertama** di `main` yang belum diubah. Setelah itu 0A, 0B, 0C, dan sisa 0D berjalan paralel. 0B memakai branch 0A untuk DB lokal begitu 0A push.

### 6.1 Task 0A — Migrasi 008–012 (agent mana pun, disarankan A)
- Tulis `008_core_v2.sql` … `012_aftersales.sql` **persis** dari RENCANA §5.1–§5.5, termasuk seed ongkir §5.3.1.
- Verifikasi daftar & kode 38 provinsi (§5.3). Kalau ada yang salah, perbaiki di SQL dan catat di log.
- Uji di DB lokal (`npx supabase start` lalu `npx supabase db reset`, atau Postgres lokal dengan skema `auth` minimal): (1) 001→012 bersih di DB kosong; (2) 008–012 dijalankan **dua kali** tanpa error (idempoten); (3) dengan data contoh (2 order, 1 cart jsonb, 1 profil beralamat): backfill `order_number`, `payment_attempts`, `order_events`, `cart_items`, `addresses`, `stock_movements` benar.
- Tulis `docs/ec-v2/LOG-0A.md`: hasil uji + **daftar query verifikasi ⚠** yang harus dijalankan Claude di DB dev sebelum apply.
- **Jangan menerapkan ke DB Supabase dev bersama.** Itu tugas Claude di G0.

### 6.2 Task 0B — Restrukturisasi Go (disarankan agent B atau D)
1. Buat `internal/httpx`, `internal/platform` (§4.2), `internal/checkout` (§4.3, termasuk `PriceLines` asli dengan `kriya_effective_price`), `internal/orderflow` (§4.4), dan penambahan `service/midtrans.go` (§4.5).
2. Pindahkan kode lama **tanpa mengubah perilaku**: katalog + admin produk/varian/gambar → `internal/catalog`; cart + profile → `internal/customer`; list/detail order + internal status + admin orders → `internal/aftersales`; admin stats → `internal/promo`; buat order + webhook + kompensasi → `internal/checkout`.
3. Jalur lama memakai port: `CreateOrder` → `Ports.Inventory.Reserve` (setelah insert order); webhook cancel/expire & kompensasi → `Ports.Inventory.Release`. Semua pembacaan harga (katalog, cart, order) memakai `kriya_effective_price` (output tidak berubah selama `sale_price` NULL).
4. `ports_legacy.go` di keempat package domain (§4.3 wiring).
5. `main.go` baru: bangun `Deps` + `Routers`, panggil `catalog/customer/promo/aftersales/checkout.RegisterRoutes`.
6. Hapus package `handler`, `repository`, `model`. Pindahkan `auth_test.go`/`midtrans_test.go` tetap hijau; tambah tes tabel untuk `CanTransition` (seluruh sel §6.1) dan tes `PriceLines` bila DB lokal tersedia.
7. **Bukti tidak ada perubahan perilaku:** `bash scripts/ec-v2/golden.sh diff` (dari 0D) → 0 selisih; alur checkout sandbox + webhook settlement/expire manual tetap benar (stok berkurang/kembali).
- `orderflow.Transition` dibuat dan dites, tapi **belum dipakai** jalur webhook/admin (dipakai D di F1 dan integrator di F2).

### 6.3 Task 0C — Restrukturisasi FE (disarankan agent A atau C)
1. `lib/http.ts` (pindahan inti fetcher dari `lib/api.ts`), modul domain `lib/{catalog,customer,promo,aftersales}/{types,api,queries,fixtures}.ts`, lalu ubah file lama menjadi barrel bernama (§5.1).
2. `lib/checkout/types.ts` + `fixtures.ts` untuk quote & order v2 (RENCANA §7.6, §7.5 `<order>`); tipe `OrderStatus` + `refunded`.
3. `lib/snap.ts` diekstrak dari `app/(store)/checkout/page.tsx`; checkout lama memakainya tanpa perubahan perilaku.
4. i18n dipecah (§5.4): key lama → `core.ts` apa adanya; file domain kosong bertipe.
5. Stub semua komponen §5.3 dengan signature final + komentar `// STUB — milik Agent X, diisi task Xn`. Pasang `WishlistNavButton` & `NotificationBell` di `site-header.tsx`.
6. `AccountNav`, halaman stub §5.5, nav admin baru (label lewat i18n).
7. Guard login (§5.5). Baca dokumen Next 16 di `node_modules/next/dist/docs/` untuk nama & API file middleware/proxy.
8. Pasang primitive shadcn yang akan dibutuhkan semua domain: `input label textarea select checkbox radio-group switch dialog sheet dropdown-menu tabs table badge skeleton separator tooltip popover` (pakai package manager repo, pnpm).
- DoD tambahan: tampilan semua halaman lama **tidak berubah** (bandingkan screenshot Playwright sebelum/sesudah), semua E2E lama hijau.

### 6.4 Task 0D — Baseline QA & perkakas (disarankan agent C atau D)
- **0D-1 (pertama, di `main` asli):** `scripts/ec-v2/golden.sh capture|diff`: rekam respons JSON semua endpoint GET yang ada (publik + dengan JWT customer & admin uji, locale `id` dan `en`) ke `scripts/ec-v2/golden/`, dengan field volatil (`created_at`, token) dinormalisasi.
- `scripts/ec-v2/ownership.txt` + `check-ownership.sh <A|B|C|D|I|0A|0B|0C|0D> <range>`: gagal bila ada file di range yang tidak cocok dengan pola pemilik (§3).
- `scripts/ec-v2/any-check.sh`: gabungan cek AGENT-QA (`any`, `interface{}`, `gin.H`, `map[string]interface{}`, `eslint-disable`, `@ts-ignore`) terbatas pada file yang berubah.
- `scripts/ec-v2/mintjwt/main.go`: mint JWT HS256 uji dari `SUPABASE_JWT_SECRET` untuk email tertentu.
- Buat 4 akun uji `ec-{a,b,c,d}@kriya.test` (Supabase Auth, password di `.env` lokal, tidak di-commit).
- `docs/ec-v2/LOG-{0A,0B,0C,0D,A,B,C,D,I}.md` dari template (bagian **Log** + **Permintaan lintas-domain**).
- Draf `AGENTS.md` root untuk opencode (isi = aturan `CLAUDE.md` + rujukan ke dokumen ini) → diserahkan ke Satria, **tidak di-commit sendiri**.
- Jalankan seluruh E2E di `main` dan catat baseline (lulus/gagal) di LOG-0D.

### 6.5 Gerbang G0 (Claude, disetujui Satria)
1. Review 0A. Cek status RLS tabel commerce di DB dev (RENCANA §11 O4). Jalankan query verifikasi ⚠; kalau ada pelanggaran, berhenti dan putuskan bersama Satria.
2. Terapkan 008–012 ke DB dev (MCP `apply_migration`), jalankan ulang verifikasi pasca-migrasi, dan cek advisor keamanan Supabase.
3. Merge 0D → 0B (`golden.sh diff` terhadap DB yang sudah bermigrasi = 0) → 0C. Jalankan build penuh + seluruh E2E di `main`.
4. Satria menambahkan addendum di KRIYA-MASTER Bagian 6/7 yang merujuk RENCANA §5.6 & §7, serta commit `AGENTS.md`.
5. Tag `ec-v2-g0`. **Sejak titik ini semua file core beku.**

---

## 7. F1 — Domain (4 agent paralel penuh)

Urutan task di dalam satu agent adalah rekomendasi; yang wajib hanya **task pertama tiap agent sesuai daftar** (menyentuh fondasi domain). Setiap task = satu sesi = satu branch.

### 7.A Agent A — Katalog & Inventori (RENCANA §4.1, §5.2, §7.2)

| ID | Task | Isi |
|---|---|---|
| **A1** | Status produk & arsip | Filter publik `status='published'` + varian `is_active` di semua query katalog; `GET /admin/products`; field status/featured/ringkasan/SEO di create/update; `DELETE` → arsip bila pernah dipesan. FE: halaman `/admin/products` pindah ke `GET /admin/products` + filter status; form produk (status, featured, ringkasan, SEO) |
| **A2** | Harga sale terjadwal | Field listing/detail `regular_price_min`, `on_sale`, `regular_price`, `sale_ends_at`; filter `on_sale`; payload varian sale. FE: isi `PriceTag` (harga coret), badge Sale di kartu, "Promo berakhir …" di PDP, input sale + jadwal di form varian |
| **A3** | Kategori bertingkat | `GET /categories` aditif; CRUD `/admin/categories`; filter kategori mencakup subkategori. FE: `/admin/catalog/categories`, breadcrumb & navigasi kategori induk/anak, deskripsi + gambar di halaman kategori |
| **A4** | Tag, atribut & facet | CRUD tag/atribut/term; `GET /tags`, `GET /attributes`; parameter `tags`, `attrs`, `in_stock`, `featured`, sort `best_selling`/`rating`; field tags/attributes di detail; assignment di form produk. FE: `filter-bar` facet (state di URL), halaman admin tag & atribut, tampilan tag/atribut di PDP |
| **A5** | Ledger stok | Ganti `ports_legacy.go` dengan `ledger.go` (Reserve/Release idempoten/Restock + movement); `/admin/inventory*`; PUT varian dengan `stock` berubah → movement `adjustment`. FE: `/admin/inventory` (tabel, filter menipis, dialog penyesuaian, riwayat per varian). **Wajib:** uji checkout + webhook expire lama masih benar dan movement tercatat |
| **A6** | Produk terkait & rating | `product_relations` di form admin; `GET /products/:slug/related`; field `rating_avg/count` di listing/detail. FE: isi `RatingStars`, pasang di kartu; blok cross-sell & upsell di PDP; pasang `WishlistButton` (kartu + PDP) dan `ProductReviews` (PDP) |
| **A7** | Seed & E2E | `cmd/seed` menyetel `status=published` & `published_at`, membuat atribut `material` dari `materials_i18n` (idempoten), tanpa mengubah kontrak `products.json`. `e2e/ec-catalog.spec.ts`: draft tak tampil, filter URL, harga coret, arsip |

### 7.B Agent B — Customer & Checkout (RENCANA §4.2, §5.3, §7.3)

| ID | Task | Isi |
|---|---|---|
| **B1** | Buku alamat | CRUD `/addresses` + default + validasi (telepon, kode pos, provinsi, maks 20); `GET /shipping/provinces`. FE: `/account/addresses` (list, dialog form, set default, hapus), isi `AddressPicker` + `useAddresses`; `/profile` hanya data diri + link ke buku alamat |
| **B2** | Keranjang relasional | Jalankan ulang backfill `cart_items` (RENCANA §5.3, idempoten) lalu cutover `GET/PUT /cart` ke `cart_items` dengan field aditif; `POST /cart/merge`. **Berhenti menulis `carts.items`** (catat untuk n8n di log). FE: `cart-store` memanggil merge saat login; baris keranjang menampilkan `PriceTag`, peringatan stok & tidak tersedia; checkout lama tetap jalan |
| **B3** | Wishlist | `/wishlist` GET/PUT/DELETE. FE: isi `WishlistButton` (optimistic, belum login → ke `/login?next=`), `WishlistNavButton` + counter, `/account/wishlist` (grid `ProductCard`) |
| **B4** | Ongkir tabel | Ganti `ports_legacy.go` dengan `shipping.go` (ShippingQuoter: zona provinsi, flat/per kg, `max_weight_kg`, gratis ongkir, urut cost) + unit test tabel untuk rumus RENCANA §4.2; `/admin/shipping/*`. FE: `/admin/shipping` (zona, provinsi, metode), isi `ShippingMethodPicker` |
| **B5** | Lanjut bayar | `POST /orders/:id/pay` (pakai ulang token aktif, atau attempt baru `KRIYA-XXXXXXXX` + tandai lama `superseded`; expiry dari `store_settings`). FE: isi `ContinuePaymentButton` via `lib/snap.ts`. *Webhook yang mengenali attempt baru dikerjakan I-BE; sampai itu, uji dengan webhook disimulasikan ke attempt pertama dan catat keterbatasannya di log* |
| **B6** | Admin pelanggan & pengaturan | `/admin/customers`, `/admin/customers/:id`, `GET/PUT /admin/settings`, `GET /store`. FE: `/admin/customers` (cari, sort, detail dengan alamat & order terakhir memakai `OrderStatusBadge`), `/admin/settings` |
| **B7** | E2E | `e2e/ec-customer.spec.ts`: alamat CRUD, merge keranjang guest→login, wishlist, ongkir per provinsi (quote port via unit test Go), lanjut bayar |

### 7.C Agent C — Promo & Laporan (RENCANA §4.3, §5.4, §7.4)

| ID | Task | Isi |
|---|---|---|
| **C1** | Kupon admin | CRUD `/admin/coupons` + redemptions, status turunan (active/scheduled/expired/inactive), `DELETE` 409 bila pernah dipakai. FE: `/admin/coupons` (list + filter, form lengkap termasuk pemilih produk/kategori, daftar pemakaian) |
| **C2** | Mesin diskon | Ganti `ports_legacy.go` dengan `discount.go`: Evaluate (urutan reason RENCANA §6.3, lock), alokasi proporsional + sisa pembulatan, Reserve/Confirm/Release. **Unit test tabel ≥ 20 kasus**: tiap reason, percent + cap, fixed > subtotal, free_shipping, cakupan produk/kategori, exclude sale, kuota global & per user yang menghitung reserved+applied, pembulatan |
| **C3** | Validasi kupon & promo publik | `POST /coupons/validate` (pakai `checkout.PriceLines` + Evaluate tanpa lock), `GET /coupons/public`. FE: isi `CouponInput` (pesan per reason via i18n), `promo-banner` menampilkan kupon publik (tombol salin kode) |
| **C4** | Laporan | `/admin/reports/summary`, `/sales` (json + csv), `/top-products`; definisi & zona waktu RENCANA §7.4; uji angka terhadap query SQL manual. FE: `/admin/reports` (pemilih periode, kartu ringkasan, grafik batang SVG, tabel terlaris, unduh CSV) |
| **C5** | Dashboard v2 | `GET /admin/stats` aditif (hitungan lintas domain via SQL baca-saja). FE: `app/(admin)/admin/page.tsx` kartu metrik + tautan ke halaman domain, daftar order terbaru dengan `OrderStatusBadge` |
| **C6** | E2E | `e2e/ec-promo.spec.ts`: CRUD kupon, validasi (valid/expired/min belanja), banner publik, laporan & CSV |

### 7.D Agent D — After-sales (RENCANA §4.4, §5.5, §7.5; menyerap `docs/rencana/RENCANA-RIWAYAT-PEMBELIAN.md`)

| ID | Task | Isi |
|---|---|---|
| **D1** | Riwayat pesanan v2 | `GET /orders` pagination + filter (maks 3 query, tanpa N+1), `<order>` v2 (order_number, item diperkaya, payment.can_continue dari `payment_attempts`, can_cancel/can_return, timeline dari `order_events`). FE **dalam commit yang sama**: `/orders` + `/orders/[id]` i18n penuh, pagination & filter, thumbnail + link produk, isi `OrderStatusBadge` dan pakai di 3 tempat (termasuk admin), pasang `ContinuePaymentButton`, bedakan error/401/kosong |
| **D2** | Event, catatan, resi | Ganti `ports_legacy.go` dengan `events.go` (order_events + notifikasi dwibahasa dari template); `PUT /admin/orders/:id/status` lewat `orderflow.Transition` (kurir/resi); `GET /admin/orders/:id`; `POST /admin/orders/:id/notes`. FE: detail pesanan admin (timeline, catatan, form kirim, attempts), tampilkan resi + catatan publik + timeline di detail customer |
| **D3** | Batal oleh customer | `POST /orders/:id/cancel` → `Transition(cancelled, customer)` (stok & kupon dilepas lewat port) + `Midtrans.CancelTransaction` best-effort di luar transaksi DB. FE: tombol + dialog konfirmasi + alasan |
| **D4** | Ulasan | Endpoint ulasan publik/saya/admin (RENCANA §7.5), aturan D6 (completed, 1 per produk per user, moderasi), `can_review`/`review_id` di item order. FE: isi `ProductReviews` (ringkasan + distribusi + list + sort/filter, memakai `RatingStars`), `/account/reviews` (bisa diulas + ulasan saya, dialog tulis/edit), `/admin/reviews` (moderasi + balas) |
| **D5** | Retur & refund | `POST /orders/:id/returns`, `/returns`, `/admin/returns`, `POST /admin/orders/:id/refunds` (nominal dihitung server, `refundable_amount`, `refunded_qty`, `Ports.Inventory.Restock` bila restock, refund penuh → `Transition(refunded)`). FE: dialog ajukan retur, `/account/returns`, `/admin/returns`, dialog refund di detail pesanan admin |
| **D6** | Notifikasi & invoice | `/notifications`, `/notifications/unread-count`, `POST /notifications/read`. FE: isi `NotificationBell` (polling ringan 60 dtk + badge), `/account/notifications`, `/orders/[id]/invoice` siap cetak (PPN termasuk, nomor order, data toko dari `GET /store`) |
| **D7** | E2E | `e2e/ec-aftersales.spec.ts`: guard login riwayat, pagination, batal, alur admin processing→shipped→completed + timeline, ulasan + moderasi, retur→refund→stok kembali, notifikasi |

### 7.5 Gerbang G1
Semua task A1–A7, B1–B7, C1–C6, D1–D7 ter-merge; build penuh + seluruh E2E (lama + 4 spec domain) hijau di `main`; permintaan lintas-domain yang terbuka sudah diputuskan; migrasi 013 (bila ada permintaan DDL yang disetujui) diterapkan. Tag `ec-v2-g1`.

---

## 8. F2 — Integrasi checkout

Ditunjuk 2 agent (disarankan dua yang paling cepat menyelesaikan F1), atau **Claude sendiri mengerjakan I-BE** karena ini jalur uang (rekomendasi). Kedua integrator boleh menulis file core yang tercantum di bawah **dan tidak ada yang lain**.

### 8.1 I-BE (core Go: `internal/checkout/**`, `internal/orderflow/**`, `internal/service/**`, `cmd/api/**`)
1. `POST /checkout/quote` (RENCANA §7.6): PriceLines → Evaluate kupon (tanpa lock) → opsi ongkir → total/pajak/problems.
2. `POST /orders` v2: satu transaksi — PriceLines(lock) → Evaluate(lock) → validasi alamat milik user & metode valid → insert order (snapshot alamat + metode + locale) → items dengan `discount_amount` → `Inventory.Reserve` → `Discounts.Reserve` → `Events.Record(created)` → `payment_attempts` aktif. Snap di luar transaksi; gagal → kompensasi (Release stok + kupon, hapus order). **Hapus body M2 lama.**
3. Webhook v2: lookup attempt (fallback `payments.midtrans_order_id`) → update attempt & `payments` → `orderflow.Transition` (paid/cancelled/expired, aktor `payment_gateway`) → `Discounts.Confirm` sudah di dalam Transition. Idempoten per attempt.
4. Tes: unit test service dengan port palsu (fake) untuk semua cabang error; uji sandbox manual (order dengan kupon + ongkir per kg, expire, settlement lewat attempt kedua).

### 8.2 I-FE (core FE: `app/(store)/checkout/**`, `lib/checkout/**`, `lib/i18n/messages/*/checkout.ts`, `e2e/transaksi.spec.ts`)
Checkout v2: `AddressPicker` → quote (debounce, refetch saat alamat/metode/kupon berubah) → `ShippingMethodPicker` → `CouponInput` → catatan → ringkasan (subtotal, diskon, ongkir, gratis ongkir, PPN termasuk, total) → tampilkan `problems` (link kembali ke keranjang) → `POST /orders` v2 → `paySnap` → redirect `/orders/[id]`; invalidate `afterKeys` & `customerKeys`. Dikembangkan dengan fixtures `lib/checkout/fixtures.ts` sampai I-BE masuk.

### 8.3 I-QA (setelah I-BE & I-FE ter-merge)
`e2e/ec-flow.spec.ts` = kriteria demo RENCANA §10 butir 4–9 end-to-end; perbarui `e2e/transaksi.spec.ts`; jalankan seluruh suite 3× untuk mendeteksi flaky.

### 8.4 Gerbang G2
Kriteria RENCANA §10 butir 1–10 terdemo manual oleh Satria; seluruh suite hijau 3× berturut-turut. Tag `ec-v2-g2`.

---

## 9. F3 — Pengerasan

### 9.1 Paralel (tiap agent, di domainnya)
- **Seed demo** idempoten `supabase/seed/ec-v2/<domain>.sql`: A → tag, atribut, relasi, 5 produk sale; B → (tidak ada, zona sudah di 010) atau alamat untuk akun demo; C → 3 kupon publik + 2 privat; D → ulasan approved untuk 10 produk dari order seed (bergantung `docs/rencana/seed-orders-plan.md`; koordinasikan lewat log).
- Audit i18n (tidak ada teks ID keras di UI domainmu), state loading/kosong/error, a11y dasar (label form, fokus dialog, kontras badge).
- `EXPLAIN ANALYZE` query terpanas domainmu (listing dengan filter, laporan, riwayat order) → usulan index ditulis sebagai **permintaan**, bukan migrasi.
- Lengkapi spec E2E domain; tidak ada tes flaky.

### 9.2 F3-Z — sekuensial (Claude/Satria)
1. Migrasi `013_*`: index yang disetujui, dan **hanya bila AGENT-AI mengonfirmasi n8n tidak membaca lagi**: drop `carts.items`; kolom alamat `profiles` & `orders.shipping_zone` dibiarkan (keputusan terpisah).
2. Update KRIYA-MASTER Bagian 6 & 7 (kontrak resmi), `docs/agents/AGENT-BE.md`/`docs/agents/AGENT-FE.md` (struktur package & modul baru), README.
3. Hapus barrel FE bila tidak ada lagi import lama (opsional).

### 9.3 Gerbang G3
Regresi penuh hijau, advisor keamanan Supabase bersih, dokumentasi terbarui. Tag `ec-v2-done`.

---

## 10. Protokol permintaan lintas-domain

Format (di bagian **Permintaan lintas-domain** file log-mu):
```
2026-10-02 · A5 · BUTUH: index stock_movements(reason, created_at) · ALASAN: filter riwayat per reason lambat (EXPLAIN terlampir) · MEMBLOKIR: tidak (sudah pakai filter variant_id) · USULAN: masuk 013
```
Jenis & penanganan oleh Claude (dicek setiap selesai merge):

| Jenis | Contoh | Keputusan |
|---|---|---|
| Kolom/tabel/index baru | kolom `addresses.lat/lng` | kumpulkan → migrasi 013+ di gerbang berikutnya, atau tolak |
| Perubahan kontrak 🔒 | tambah field wajib di `<order>` | Claude update RENCANA §7 dulu, baru pemilik mengerjakan |
| Perubahan file core | helper baru di `httpx` | Claude kerjakan sendiri di `main` lalu umumkan, atau tolak (pemilik menulis helper lokal di package-nya) |
| Kebutuhan dari domain lain | D butuh `stock_after` di respons Restock | jadikan task tambahan untuk pemilik |
| Library/komponen UI baru | `date-picker` | Satria putuskan (R13) |

Agent **tidak menunggu**: lanjutkan bagian yang tidak terblokir atau task berikutnya di daftarmu.

---

## 11. Checklist review & merge (Claude)

Per branch `ec/<ID>-*`:
1. `git fetch && git log --oneline origin/main..origin/ec/<ID>-*`: commit berprefix benar, satu task.
2. `bash scripts/ec-v2/check-ownership.sh <X> origin/main...origin/ec/<ID>-*` → **pelanggaran = tolak**, minta dipindah atau dijadikan permintaan.
3. Checkout branch di worktree review: build Go + `tsc` + `eslint` + `next build`; `any-check.sh`.
4. Kontrak: jalankan `curl` dari body commit terhadap API branch; bandingkan dengan RENCANA §7 field per field; cek fixtures cocok.
5. Aturan domain: tulis DB hanya ke tabel sendiri (grep `Table("`/`Model(&` ke tabel domain lain); tidak ada `UPDATE orders SET status` di luar `orderflow`; tidak ada import package domain lain.
6. Jalankan spec E2E domain + `transaksi.spec.ts` (**wajib** untuk A5, B2, C2, D2, D3 karena port-nya aktif di jalur checkout).
7. Merge `git merge --no-ff`, lalu **build ulang di `main`** (menangkap tabrakan lintas branch yang lolos di masing-masing branch), push, dan hapus branch.
8. Balas di log agent bila ada catatan; cek bagian permintaan lintas-domain.

Urutan merge antar agent bebas karena file tidak beririsan. Kalau terjadi konflik git, itu tanda pelanggaran kepemilikan: selidiki dulu, jangan langsung di-resolve.

---

## 12. Prompt peluncuran opencode

opencode membaca `AGENTS.md` di root (disiapkan 0D, di-commit Satria di G0). Opsional: definisikan agent khusus per domain di konfigurasi opencode (mis. `.opencode/agent/ec-a.md`); cek dokumentasi opencode versi yang dipakai untuk format pastinya.

**Template (satu sesi = satu task):**
```
Kamu adalah Agent {X} ({nama domain}) dalam program KRIYA E-commerce v2.
Worktree: C:\Porto\kriya-wt\agent-{x}. Task: {ID} — {judul}.

Sebelum menulis kode, baca:
- docs/agents/KRIYA-MASTER.md Bagian 5 dan 10
- docs/rencana/EKSEKUSI-PARALEL-V2.md §0–§5 dan baris task {ID} di §7.{X}
- docs/rencana/RENCANA-ECOMMERCE-V2.md bagian yang dirujuk task {ID}
- docs/ec-v2/LOG-{X}.md

Aturan keras:
- Kerjakan HANYA task {ID}. Branch: ec/{ID}-{slug} dari origin/main terbaru.
- Hanya ubah file yang cocok dengan pola kepemilikan {X} di §3. Tidak ada DDL.
- Jangan ubah signature port Go (§4) atau props komponen lintas domain (§5.3).
- Dilarang any / as any / interface{} / gin.H / eslint-disable / @ts-ignore.
- Data uji berprefix sesuai §2.1 dan dibersihkan di akhir.

Selesai = seluruh DoD §2.2 hijau (tempel output ringkas), commit "[ec-{x}] …" dengan contoh curl
di body, push branch, satu baris di docs/ec-v2/LOG-{X}.md. Jangan merge ke main.
Bila butuh sesuatu di luar kepemilikanmu: tulis di "Permintaan lintas-domain" LOG-{X}.md,
kerjakan bagian yang tidak terblokir, dan sebutkan di ringkasan akhir.
```

**Tambahan khusus F0** (untuk 0A/0B/0C/0D): ganti baris task dengan "§6.{n} Task 0{A|B|C|D}" dan kepemilikan dengan §3.3 / "core (F0 saja)". Untuk 0B dan 0C tambahkan: *"Ini refactor tanpa perubahan perilaku. Bukti: golden diff 0 (0B) / screenshot identik + E2E lama hijau (0C)."*

**Tambahan khusus F2** (integrator): *"Kamu integrator {I-BE|I-FE}. Kamu boleh menulis file core yang tercantum di §8.{1|2} dan tidak ada yang lain."*

---

## 13. Ringkasan tanggung jawab

| Pihak | F0 | F1 | F2 | F3 |
|---|---|---|---|---|
| Agent A | 0A (SQL) atau 0C | A1–A7 | (opsional integrator) | seed/audit katalog |
| Agent B | 0B (Go) | B1–B7 | (opsional integrator) | audit customer |
| Agent C | 0C (FE) atau 0D | C1–C6 | (opsional integrator) | seed/audit promo |
| Agent D | 0D (QA) atau 0B | D1–D7 | I-QA | seed/audit after-sales |
| Claude | review, terapkan migrasi, G0 | review & merge per branch, triase permintaan, migrasi 013 | review ketat / kerjakan I-BE | F3-Z, update dokumen |
| Satria | setujui G0, commit AGENTS.md + addendum master | putuskan permintaan dependency/kontrak | demo G2 | setujui drop kolom, G3 |
