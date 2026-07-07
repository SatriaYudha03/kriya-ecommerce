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

*   **Frontend (`apps/web`)**: Next.js 16 (App Router) client application with TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, and Zustand. 
*   **Commerce Backend (`services/api`)**: Go Gin REST API. Manages catalog data, users, carts, transactions, order creation, and handles Midtrans Sandbox payment notifications.
*   **AI Backend (`services/ai`)**: Python FastAPI backend utilizing `Gemini text-embedding-004` (768 dimensions) to provide semantic catalog search and find similar products.
*   **Automation Engine (`automation/n8n`)**: Self-hosted n8n instance executing workflows (order confirmation, abandoned-cart follow-up) and hosting the RAG-based customer support chat assistant.
*   **Database & Storage (Supabase)**: Managed Postgres database, Supabase Auth for sessions, S3-compatible Storage for product assets, and pgvector extension for embedding searches.
*   **Payment Gateway**: Midtrans Snap Sandbox integration.

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
Apply database migrations using `psql` to set up tables, triggers, and indices:
```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/001_commerce_core.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/002_orders.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/003_automation_indexes.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/004_vector.sql
```

### Step 4: Load Catalog Seed Data
Load the initial product catalog into the database:
```bash
cd services/api
go run cmd/seed/main.go
cd ../..
```

---

## 4. Running the Platform

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

## 5. Development Rituals

*   **Linter & Formatting (Frontend)**: Run `pnpm lint` and `pnpm build` in `apps/web` before committing frontend changes.
*   **Linter (Go API)**: Run `go build ./...` and `go vet` in `services/api` before committing backend changes.
*   **Database Changes**: Never use `AutoMigrate`. All schema alterations must be added sequentially under `supabase/migrations/` using SQL files.
