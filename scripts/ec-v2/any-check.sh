#!/usr/bin/env bash
# scripts/ec-v2/any-check.sh
# Memeriksa penggunaan tipe `any`, `interface{}`, `gin.H`, `map[string]interface{}`, 
# `eslint-disable`, dan `@ts-ignore` pada file yang berubah di working tree/index 
# atau di branch saat ini dibandingkan dengan main.

set -euo pipefail

# Find all changed files (staged, unstaged, and uncommitted in current branch)
# We can just check files changed relative to origin/main or HEAD if we are comparing
TARGET=${1:-"origin/main...HEAD"}

# if we just want current changed files or all changed in a branch:
FILES=$(git diff --name-only "$TARGET" 2>/dev/null || git diff --name-only HEAD)

if [ -z "$FILES" ]; then
  echo "No changed files to check for any/interface{}."
  exit 0
fi

VIOLATIONS=0

for file in $FILES; do
  if [ ! -f "$file" ]; then continue; fi
  
  if [[ "$file" == *.ts || "$file" == *.tsx ]]; then
    # Check for `any` as type, `@ts-ignore`, `eslint-disable`
    # Simple grep for typical patterns:
    # `any` with word boundary, ignoring some safe uses like `any[]` is hard with simple grep,
    # but we look for `: any`, `as any`, `@ts-ignore`, `eslint-disable`.
    if grep -nE '(: any\b|as any\b|@ts-ignore|eslint-disable)' "$file"; then
      echo "Violation found in TS/TSX file: $file"
      VIOLATIONS=1
    fi
  elif [[ "$file" == *.go ]]; then
    # Check for `interface{}`, `gin.H`, `map[string]interface{}`
    if grep -nE '(interface\{\}|gin\.H\b|map\[string\]interface\{\})' "$file"; then
      echo "Violation found in Go file: $file"
      VIOLATIONS=1
    fi
  fi
done

if [ "$VIOLATIONS" -eq 1 ]; then
  echo "FAIL: any-check found violations. Please remove 'any', 'interface{}', 'gin.H', etc." >&2
  exit 1
else
  echo "any-check passed."
  exit 0
fi
