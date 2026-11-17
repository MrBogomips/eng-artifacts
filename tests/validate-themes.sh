#!/usr/bin/env bash
# Theme completeness: same token set in every theme and in its light and both dark blocks, identical
# dark blocks, every color token in all three blocks, every font role with a fallback, default tokens
# equal to the vocabulary of design.md, the alternate theme unlike the default in every token group.
# Usage: validate-themes.sh [theme-dir]   (default: shared/themes)
set -u
. "$(dirname "$0")/lib.sh"
need python3

DIR="${1:-$ROOT/shared/themes}"
out=$(python3 -I "$ROOT/tests/py/check_themes.py" "$ROOT" "$DIR" 2>&1)
rc=$?
[ -z "$out" ] || printf '%s\n' "$out"
[ "$rc" -eq 0 ] || FAILURES=$((FAILURES + $(printf '%s\n' "$out" | grep -c .)))
finish validate-themes
