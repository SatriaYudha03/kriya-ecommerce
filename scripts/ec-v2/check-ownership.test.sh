#!/usr/bin/env bash
# scripts/ec-v2/check-ownership.test.sh — regresi kecil untuk check-ownership.sh.
#
# Dibuat setelah audit 2026-09-26 menemukan check-ownership.sh selalu "lulus"
# tanpa validasi nyata (bug heredoc/stdin, lihat docs/ec-v2/AUDIT-F1-A1D1-2026-09-26.md).
# Jalankan sebelum percaya hasil check-ownership.sh lagi setelah menyentuh skrip ini:
#   bash scripts/ec-v2/check-ownership.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="$SCRIPT_DIR/check-ownership.sh"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
cd "$WORKDIR"

git init -q
git config user.email test@test.local
git config user.name test
git commit -q --allow-empty -m init

mkdir -p docs/ec-v2 docs/report services/api/internal/catalog services/api/internal/customer
touch docs/ec-v2/STATUS.md docs/report/A1.md services/api/internal/catalog/x.go services/api/internal/customer/y.go
git add -A && git commit -q -m base

fail=0

assert_pass() {
  local desc="$1" agent="$2" range="$3"
  if bash "$CHECK" "$agent" "$range" > /dev/null 2>&1; then
    echo "PASS: $desc"
  else
    echo "FAIL (expected pass): $desc"
    fail=1
  fi
}

assert_fail() {
  local desc="$1" agent="$2" range="$3"
  if bash "$CHECK" "$agent" "$range" > /dev/null 2>&1; then
    echo "FAIL (expected violation): $desc"
    fail=1
  else
    echo "PASS: $desc"
  fi
}

# Kasus 1: agent A mengubah STATUS.md + laporan sendiri saat tutup sesi -> harus lulus.
git checkout -q -b case1
echo x >> docs/ec-v2/STATUS.md
echo x >> docs/report/A1.md
git add -A && git commit -q -m "A closes session"
assert_pass "agent A ubah STATUS.md + docs/report/A1.md sendiri" A HEAD~1...HEAD

# Kasus 2: agent B mengubah docs/report/A1.md milik A -> harus GAGAL (deteksi bug asli).
git checkout -q -b case2 main 2>/dev/null || git checkout -q -b case2 master
echo x >> docs/report/A1.md
git add -A && git commit -q -m "B touches A's report"
assert_fail "agent B ubah docs/report/A1.md milik A" B HEAD~1...HEAD

# Kasus 3: agent A menulis ke domain sendiri (internal/catalog) -> harus lulus.
git checkout -q -b case3 main 2>/dev/null || git checkout -q -b case3 master
echo x >> services/api/internal/catalog/x.go
git add -A && git commit -q -m "A writes own domain"
assert_pass "agent A ubah internal/catalog milik sendiri" A HEAD~1...HEAD

# Kasus 4: agent A menulis ke domain B (internal/customer) -> harus GAGAL.
git checkout -q -b case4 main 2>/dev/null || git checkout -q -b case4 master
echo x >> services/api/internal/customer/y.go
git add -A && git commit -q -m "A writes B's domain"
assert_fail "agent A ubah internal/customer milik B" A HEAD~1...HEAD

if [ "$fail" -ne 0 ]; then
  echo "REGRESI: check-ownership.sh tidak berperilaku seperti yang diharapkan." >&2
  exit 1
fi
echo "Semua kasus regresi check-ownership.sh lulus."
