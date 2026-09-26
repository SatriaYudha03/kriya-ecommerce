#!/usr/bin/env bash
# scripts/ec-v2/golden.sh — snapshot JSON semua endpoint GET Gin (docs/rencana/EKSEKUSI-PARALEL-V2.md §6.4, task 0D-1).
#
#   golden.sh capture   rekam respons semua endpoint GET ke scripts/ec-v2/golden/ (commit hasilnya).
#   golden.sh diff       rekam ulang di working tree saat ini dan bandingkan dengan scripts/ec-v2/golden/;
#                         exit 0 bila 0 selisih, exit 1 bila ada (dipakai 0B: "golden.sh diff → 0 selisih").
#
# Butuh: go, psql, curl, openssl, python (atau python3), variabel di .env root
# (SUPABASE_DB_URL, SUPABASE_JWT_SECRET, WEB_ORIGIN opsional).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
GOLDEN_DIR="$SCRIPT_DIR/golden"
PORT="${GOLDEN_PORT:-8097}"
API_BASE="http://127.0.0.1:$PORT/api/v1"
ROOT_BASE="http://127.0.0.1:$PORT"

PY=python
command -v python >/dev/null 2>&1 || PY=python3

usage() {
  echo "usage: $0 {capture|diff}" >&2
  exit 2
}

[ $# -eq 1 ] || usage
ACTION="$1"
case "$ACTION" in
  capture|diff) ;;
  *) usage ;;
esac

if [ ! -f "$REPO_ROOT/.env" ]; then
  echo "golden.sh: $REPO_ROOT/.env tidak ada" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
. "$REPO_ROOT/.env"
set +a

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL kosong di .env}"
: "${SUPABASE_JWT_SECRET:?SUPABASE_JWT_SECRET kosong di .env}"
WEB_ORIGIN="${WEB_ORIGIN:-http://localhost:3000}"
INTERNAL_API_KEY="${INTERNAL_API_KEY:-}"

WORK_DIR="$(mktemp -d)"
RAW_DIR="$WORK_DIR/raw"
mkdir -p "$RAW_DIR"
BIN="$WORK_DIR/golden-api.exe"
SERVER_PID=""

stop_server() {
  # PID MSYS ($!) tidak selalu memetakan bersih ke proses Windows untuk exe
  # native (git-bash/MSYS quirk), jadi hentikan lewat taskkill by image name —
  # aman karena nama biner ini unik untuk golden.sh.
  taskkill //F //IM golden-api.exe >/dev/null 2>&1 || true
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}

cleanup() {
  stop_server
  if [ -z "${GOLDEN_KEEP_WORKDIR:-}" ]; then
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

taskkill //F //IM golden-api.exe >/dev/null 2>&1 || true

echo "== golden.sh $ACTION: build API dari working tree saat ini ==" >&2
(cd "$REPO_ROOT/services/api" && go build -o "$BIN" ./cmd/api)

echo "== golden.sh $ACTION: jalankan API di :$PORT ==" >&2
(
  cd "$REPO_ROOT"
  PORT="$PORT" WEB_ORIGIN="$WEB_ORIGIN" "$BIN" > "$WORK_DIR/server.log" 2>&1 &
  echo $! > "$WORK_DIR/server.pid"
)
SERVER_PID="$(cat "$WORK_DIR/server.pid")"

ready=0
for _ in $(seq 1 40); do
  if curl -sf "$ROOT_BASE/healthz" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.5
done
if [ "$ready" -ne 1 ]; then
  echo "golden.sh: API tidak siap setelah 20 detik, lihat log:" >&2
  cat "$WORK_DIR/server.log" >&2
  exit 1
fi

echo "== golden.sh $ACTION: ambil data contoh dari DB ==" >&2
# psql di Windows/git-bash menyelipkan \r di akhir baris -> tr -d '\r' dulu,
# jangan sampai masuk ke URL curl (curl exit 3: URL malformed).
IFS='|' read -r PRODUCT_SLUG PRODUCT_ID < <(
  psql "$SUPABASE_DB_URL" -tA -F'|' -c \
    "select slug, id from products order by created_at asc limit 1;" | tr -d '\r'
)
IFS='|' read -r CUSTOMER_ID CUSTOMER_EMAIL < <(
  psql "$SUPABASE_DB_URL" -tA -F'|' -c \
    "select p.id, u.email from profiles p join auth.users u on u.id = p.id
     where p.role = 'customer' order by p.id limit 1;" | tr -d '\r'
)
IFS='|' read -r ADMIN_ID < <(
  psql "$SUPABASE_DB_URL" -tA -F'|' -c \
    "select id from profiles where role = 'admin' order by id limit 1;" | tr -d '\r'
)
IFS='|' read -r ORDER_ID < <(
  psql "$SUPABASE_DB_URL" -tA -F'|' -c \
    "select id from orders where user_id = '$CUSTOMER_ID' order by created_at asc limit 1;" | tr -d '\r'
)

if [ -z "$PRODUCT_SLUG" ] || [ -z "$CUSTOMER_ID" ] || [ -z "$ADMIN_ID" ] || [ -z "$ORDER_ID" ]; then
  echo "golden.sh: data contoh tidak lengkap (produk/customer/admin/order) — DB dev butuh seed minimal." >&2
  exit 1
fi

b64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

mint_jwt() {
  # mint_jwt <user_id> — HS256 dengan SUPABASE_JWT_SECRET legacy (lihat internal/middleware/auth.go).
  local sub="$1"
  local exp
  exp=$(( $(date +%s) + 3600 ))
  local header='{"alg":"HS256","typ":"JWT"}'
  local payload
  payload=$(printf '{"sub":"%s","role":"authenticated","aud":"authenticated","exp":%s}' "$sub" "$exp")
  local signing_input
  signing_input="$(printf '%s' "$header" | b64url).$(printf '%s' "$payload" | b64url)"
  local signature
  signature="$(printf '%s' "$signing_input" | openssl dgst -sha256 -mac HMAC -macopt "key:$SUPABASE_JWT_SECRET" -binary | b64url)"
  printf '%s.%s' "$signing_input" "$signature"
}

CUSTOMER_JWT="$(mint_jwt "$CUSTOMER_ID")"
ADMIN_JWT="$(mint_jwt "$ADMIN_ID")"

# capture <name> <url> [header...]
capture() {
  local name="$1"; shift
  local url="$1"; shift
  local -a curl_headers=()
  local h
  for h in "$@"; do
    curl_headers+=(-H "$h")
  done
  local status
  status=$(curl -s --max-time 20 --retry 2 --retry-delay 1 -o "$RAW_DIR/$name.body" -w '%{http_code}' "${curl_headers[@]}" "$url")
  printf '%s' "$status" > "$RAW_DIR/$name.status"
}

echo "== golden.sh $ACTION: capture endpoint publik ==" >&2
capture "healthz-root" "$ROOT_BASE/healthz"
capture "healthz-v1" "$API_BASE/healthz"
capture "categories-id" "$API_BASE/categories?lang=id"
capture "categories-en" "$API_BASE/categories?lang=en"
capture "products-id" "$API_BASE/products?lang=id&page=1&limit=20"
capture "products-en" "$API_BASE/products?lang=en&page=1&limit=20"
capture "product-detail-id" "$API_BASE/products/$PRODUCT_SLUG?lang=id"
capture "product-detail-en" "$API_BASE/products/$PRODUCT_SLUG?lang=en"

echo "== golden.sh $ACTION: capture endpoint customer (JWT) ==" >&2
AUTH_CUSTOMER="Authorization: Bearer $CUSTOMER_JWT"
capture "profile" "$API_BASE/profile" "$AUTH_CUSTOMER"
capture "cart" "$API_BASE/cart" "$AUTH_CUSTOMER"
capture "orders-list-id" "$API_BASE/orders?lang=id" "$AUTH_CUSTOMER"
capture "orders-list-en" "$API_BASE/orders?lang=en" "$AUTH_CUSTOMER"
capture "order-detail-id" "$API_BASE/orders/$ORDER_ID?lang=id" "$AUTH_CUSTOMER"
capture "order-detail-en" "$API_BASE/orders/$ORDER_ID?lang=en" "$AUTH_CUSTOMER"

echo "== golden.sh $ACTION: capture endpoint admin (JWT) ==" >&2
AUTH_ADMIN="Authorization: Bearer $ADMIN_JWT"
capture "admin-stats" "$API_BASE/admin/stats" "$AUTH_ADMIN"
capture "admin-orders" "$API_BASE/admin/orders" "$AUTH_ADMIN"
capture "admin-product-detail" "$API_BASE/admin/products/$PRODUCT_ID" "$AUTH_ADMIN"

if [ -n "$INTERNAL_API_KEY" ]; then
  echo "== golden.sh $ACTION: capture endpoint internal (X-Internal-Key) ==" >&2
  capture "internal-order-status" \
    "$API_BASE/internal/orders/status?order_id=$ORDER_ID&email=$CUSTOMER_EMAIL" \
    "X-Internal-Key: $INTERNAL_API_KEY"
else
  echo "== golden.sh $ACTION: INTERNAL_API_KEY kosong, lewati endpoint internal ==" >&2
fi

stop_server
SERVER_PID=""

if [ "$ACTION" = "capture" ]; then
  rm -rf "$GOLDEN_DIR"
  "$PY" "$SCRIPT_DIR/golden_normalize.py" normalize "$RAW_DIR" "$GOLDEN_DIR"
  echo "== golden.sh capture: ditulis ke $GOLDEN_DIR ==" >&2
  ls "$GOLDEN_DIR" >&2
  exit 0
fi

# diff
CANDIDATE_DIR="$WORK_DIR/normalized"
"$PY" "$SCRIPT_DIR/golden_normalize.py" normalize "$RAW_DIR" "$CANDIDATE_DIR"
if [ ! -d "$GOLDEN_DIR" ]; then
  echo "golden.sh diff: $GOLDEN_DIR belum ada — jalankan 'golden.sh capture' dulu di main asli." >&2
  exit 1
fi
"$PY" "$SCRIPT_DIR/golden_normalize.py" diff "$GOLDEN_DIR" "$CANDIDATE_DIR"
