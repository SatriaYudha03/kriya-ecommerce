# KRIYA — E-commerce Furniture & AI Platform

KRIYA is a single-vendor, IKEA-style furniture e-commerce platform designed for the Indonesian market, powered by Gemini AI and automation engines.

---

## 1. System Architecture

The project is structured as a microservices architecture coordinated via Docker Compose:

```
                          ┌───────────────┐
                          │  Next.js Web  │ (Frontend, Port 3000)
                          └───────┬───────┘
                                  │
                  ┌───────────────┼───────────────┐
                  ▼                               ▼
         ┌─────────────────┐             ┌─────────────────┐
         │     Go API      │             │    FastAPI AI   │ (Backend, Port 8000)
         │  (Commerce,8080)│             │ (Semantic, 8000)│
         └────────┬────────┘             └────────┬────────┘
                  │                               │
                  └───────────────┬───────────────┘
                                  ▼
                        ┌───────────────────┐
                        │  Supabase Cloud   │ (PostgreSQL, Auth, Storage, Vector)
                        └───────────────────┘
                                  ▲
                                  │
                          ┌───────┴───────┐
                          │   n8n Engine  │ (Automation & Chat, Port 5678)
                          └───────────────┘
```

### Components

*   **Frontend (`apps/web`)**: Next.js 16 (App Router) client application with TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, and Zustand. Structured modularly per domain (`lib/{catalog,customer,promo,aftersales,checkout}`) with bilingual support (ID/EN) and accessible UI components.
*   **Commerce Backend (`services/api`)**: Go Gin REST API organized cleanly into domain packages (`internal/{catalog,customer,promo,aftersales,checkout,orderflow,httpx,platform}`). Handles hierarchical categories, facet filtering, inventory ledger, address books, relational carts, table-based shipping rates, promotional coupon engine, order status transitions, product reviews, returns/refunds, and Midtrans Sandbox notifications.
*   **AI Backend (`services/ai`)**: Python FastAPI backend utilizing `Gemini text-embedding-004` (768 dimensions) to provide semantic catalog search and find similar products.
*   **Automation Engine (`automation/n8n`)**: Self-hosted n8n instance executing workflows (order confirmation, abandoned-cart follow-up) and hosting the RAG-based customer support chat assistant.
*   **Database & Storage (Supabase)**: Managed Postgres database with 13 sequential migrations (`001` through `013`), Supabase Auth for sessions, S3-compatible Storage for product assets, and pgvector extension for embedding searches.
*   **Payment Gateway**: Midtrans Snap Sandbox integration with cryptographic SHA-512 webhook verification and stateful order transitions.

---

## 2. Prerequisites

Ensure you have the following installed locally:
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
*   [Go](https://go.dev/doc/install) v1.22+
*   [Node.js](https://nodejs.org/) v18+ & [pnpm](https://pnpm.io/)
*   [Python](https://www.python.org/downloads/) v3.11+
*   [PostgreSQL CLI (psql)](https://www.postgresql.org/download/)

---

## 3. Installation & Configuration

### Step 1: Clone the Repository
```bash
git clone <repository_url> kriya-ecommerce
cd kriya-ecommerce
```

### Step 2: Environment Variables Setup
Copy the example environment file and fill in your keys:
```bash
cp .env.example .env
cp .env.example apps/web/.env
```
Ensure you set:
*   `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`
*   `SUPABASE_DB_URL`
*   `SUPABASE_JWT_SECRET`
*   `GEMINI_API_KEY` (needed for FastAPI AI service)
*   `MIDTRANS_SERVER_KEY` & `MIDTRANS_CLIENT_KEY`

### Step 3: Run Database Migrations
Apply database migrations sequentially (`001` to `013`) using `psql` to set up tables, triggers, constraints, and performance indexes:
```bash
for file in supabase/migrations/*.sql; do
  psql "$SUPABASE_DB_URL" -f "$file"
done
```

### Step 4: Load Catalog Seed Data
Load the initial product catalog into the database:
```bash
cd services/api
go run cmd/seed/main.go
cd ../..
```

---

## 4. API Endpoints Overview (v2)

### Public Endpoints
*   `GET /api/v1/categories`: Hierarchical category tree.
*   `GET /api/v1/products`: Product listing with facet attribute filters, sort, and sale pricing.
*   `GET /api/v1/products/:slug`: Product details, variants, dimensions, and materials.
*   `GET /api/v1/products/:slug/related`: Upsell and cross-sell related products.
*   `GET /api/v1/coupons/public`: Active public promotional coupons.
*   `POST /api/v1/coupons/validate`: Coupon validation and discount preview.
*   `GET /api/v1/shipping/provinces`: Indonesian province shipping reference data.
*   `GET /api/v1/store`: Public store settings and contact info.
*   `GET /api/v1/products/:slug/reviews`: Approved customer reviews and summary rating.

### Authenticated Customer Endpoints
*   `GET/PUT /api/v1/profile`: Customer profile details.
*   `GET/POST/PUT/DELETE /api/v1/addresses`: Address book management and default address selection.
*   `GET/PUT /api/v1/cart`: Relational shopping cart (`cart_items`) with server-calculated totals.
*   `POST /api/v1/cart/merge`: Sync and merge guest cart into customer account upon sign-in.
*   `GET/PUT/DELETE /api/v1/wishlist`: Customer wishlist management.
*   `POST /api/v1/checkout/quote`: Deterministic checkout quote (subtotal, weighted shipping, discounts).
*   `POST /api/v1/orders`: Order creation v2 with inventory ledger reservation & payment token generation.
*   `GET /api/v1/orders` & `GET /api/v1/orders/:id`: Customer order history and order tracking.
*   `POST /api/v1/orders/:id/pay`: Retry / resume payment with fresh Snap token.
*   `POST /api/v1/orders/:id/cancel`: Customer self-service order cancellation.
*   `GET/POST/PUT /api/v1/reviews/me`: Customer product review submission and editing.
*   `GET/POST /api/v1/returns`: Customer return request submission and status tracking.
*   `GET /api/v1/notifications`: In-app notification center and unread counter.

### Admin Endpoints (`/api/v1/admin`)
*   `GET/POST/PUT/DELETE /api/v1/admin/categories`: Category management.
*   `GET/POST/PUT/DELETE /api/v1/admin/products`: Product, variant, and image management.
*   `GET/POST/PUT/DELETE /api/v1/admin/tags`: Tag management.
*   `GET/POST/PUT/DELETE /api/v1/admin/attributes`: Attribute and term facet management.
*   `GET/POST /api/v1/admin/inventory`: Stock listing and manual ledger adjustments.
*   `GET /api/v1/admin/customers`: Customer registry and purchase history.
*   `GET/PUT /api/v1/admin/shipping`: Shipping zones and tiered method rates.
*   `GET/POST/PUT/DELETE /api/v1/admin/coupons`: Coupon campaigns and redemption logs.
*   `GET /api/v1/admin/reports/*`: Sales summaries, time series, and top products.
*   `GET /api/v1/admin/stats`: Real-time dashboard performance metrics.
*   `GET/PUT /api/v1/admin/orders`: Order fulfillment, tracking numbers, notes, and status transitions.
*   `GET/PUT /api/v1/admin/reviews`: Review moderation and admin replies.
*   `GET/PUT /api/v1/admin/returns`: Return request approvals and refund processing.

### Webhook & Automation
*   `POST /api/v1/payments/midtrans/notification`: Midtrans payment notification with SHA-512 signature check.
*   `GET /api/v1/internal/orders/status`: Secured internal endpoint for chatbot order queries.

---

## 5. Running the Platform

### Running Backend Services (Docker Compose)
Start the Go Commerce Backend, Python FastAPI AI Backend, and n8n Engine using Docker Compose:
```bash
docker compose up -d --build
```
Verify services are active:
*   Go API: `http://localhost:8080/healthz`
*   FastAPI AI: `http://localhost:8000/healthz`
*   n8n Engine: `http://localhost:5678`

### Running the Frontend (Local Development)
Start the Next.js frontend application:
```bash
cd apps/web
pnpm install
pnpm dev
```
Open `http://localhost:3000` in your browser.

---

## 6. Development Rituals

*   **Linter & Formatting (Frontend)**: Run `pnpm lint` and `pnpm build` in `apps/web` before committing frontend changes.
*   **Linter (Go API)**: Run `go build ./...` and `go vet` in `services/api` before committing backend changes.
*   **Database Changes**: Never use `AutoMigrate`. All schema alterations must be added sequentially under `supabase/migrations/` using SQL files.
