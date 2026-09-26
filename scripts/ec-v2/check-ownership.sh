#!/usr/bin/env bash
# scripts/ec-v2/check-ownership.sh <A|B|C|D|I|0A|0B|0C|0D> <range>

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <AGENT> <COMMIT_RANGE>" >&2
  exit 1
fi

AGENT="$1"
RANGE="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OWNERSHIP_FILE="$SCRIPT_DIR/ownership.txt"

if [ ! -f "$OWNERSHIP_FILE" ]; then
  echo "Error: ownership.txt not found at $OWNERSHIP_FILE" >&2
  exit 1
fi

CHANGED_FILES=$(git diff --name-only "$RANGE")
if [ -z "$CHANGED_FILES" ]; then
  echo "No files changed in $RANGE."
  exit 0
fi

# Use Python for reliable glob matching
PY=python
command -v python >/dev/null 2>&1 || PY=python3

SCRIPT_FILE="$(mktemp)"
trap 'rm -f "$SCRIPT_FILE"' EXIT
cat > "$SCRIPT_FILE" << 'EOF'
import sys
import fnmatch
import os

agent = sys.argv[1]
ownership_file = sys.argv[2]
changed_files_file = sys.argv[3]
with open(changed_files_file, 'r') as f:
    changed_files = f.read().splitlines()

# Parse ownership file
# Keep rules in order, last match might win, but we'll collect all owners for a file
rules = []
with open(ownership_file, 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split(' ', 1)
        if len(parts) == 2:
            rules.append((parts[0], parts[1]))

violations = []

def match_pattern(file_path, pattern):
    # Convert **/ to a format fnmatch can handle somewhat, or implement custom
    if '**' in pattern:
        # Simplistic approach: if pattern ends with **, check if file starts with the prefix
        if pattern.endswith('/**'):
            prefix = pattern[:-3]
            return file_path == prefix or file_path.startswith(prefix + '/')
        # Not handling other ** cases perfectly, but fnmatch handles * over slashes in python!
    
    return fnmatch.fnmatch(file_path, pattern)

for file in changed_files:
    file = file.replace('\\', '/')
    
    file_owners = []
    for owner, pattern in rules:
        if match_pattern(file, pattern):
            file_owners.append(owner)
    
    if not file_owners:
        actual_owner = "core" # Default rule
    else:
        # Last rule matches
        actual_owner = file_owners[-1]
    
    # Is the agent allowed?
    allowed = False
    
    # Allowed rules:
    if agent == actual_owner:
        allowed = True
    elif actual_owner == "shared":
        # docs/ec-v2/STATUS.md: setiap agent WAJIB mengubahnya sendiri saat
        # klaim/tutup sesi (R14/R18/§12) -- bukan pelanggaran kepemilikan.
        allowed = True
    elif agent in ("0A", "0B", "0C", "0D") and actual_owner in (agent, "core"):
        # F0 agents have specific domains but also core for 0B/0C ?
        # Wait, the spec says:
        # 0A: supabase/migrations...
        # 0B: seluruh services/api/**
        # 0C: seluruh apps/web/**
        # 0D: scripts/ec-v2/**, docs/ec-v2/**
        # If the file falls into their F0 scope, actual_owner will be their name because we added it to ownership.txt
        pass
        
    if agent == "0A" and actual_owner == "0A": allowed = True
    if agent == "0B" and actual_owner == "0B": allowed = True
    if agent == "0C" and actual_owner == "0C": allowed = True
    if agent == "0D" and (actual_owner == "0D" or actual_owner == "Claude"): allowed = True
    if agent == "I" and actual_owner == "I": allowed = True
    
    if not allowed:
        violations.append(f"File {file} is owned by '{actual_owner}', but modified by agent '{agent}'.")

if violations:
    for v in violations:
        print(v, file=sys.stderr)
    sys.exit(1)
else:
    print(f"Ownership check passed for agent {agent}.")
EOF

CHANGED_FILES_FILE="$(mktemp)"
trap 'rm -f "$SCRIPT_FILE" "$CHANGED_FILES_FILE"' EXIT
printf '%s\n' "$CHANGED_FILES" > "$CHANGED_FILES_FILE"

$PY "$SCRIPT_FILE" "$AGENT" "$OWNERSHIP_FILE" "$CHANGED_FILES_FILE"
