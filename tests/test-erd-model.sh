#!/usr/bin/env bash
# ERD model validation: every valid fixture passes, every invalid fixture fails with its message.
set -u
. "$(dirname "$0")/lib.sh"
need python3

VALIDATOR="$ROOT/skills/erd/scripts/erd_model.py"
FIX="$ROOT/tests/fixtures/erd"

for f in "$FIX"/valid/*.erd.json; do
    out=$(python3 -I "$VALIDATOR" "$f" 2>&1) || fail "${f#"$ROOT"/}" "valid fixture rejected: $out"
done

expect() { # expect <fixture name> <expected message substring>
    local f="$FIX/invalid/$1.erd.json" out
    [ -f "$f" ] || { fail "tests/fixtures/erd/invalid/$1.erd.json" "missing fixture"; return; }
    out=$(python3 -I "$VALIDATOR" "$f" 2>&1)
    if [ $? -eq 0 ]; then
        fail "${f#"$ROOT"/}" "invalid fixture accepted"
    elif ! printf '%s' "$out" | grep -qF -- "$2"; then
        fail "${f#"$ROOT"/}" "message lacks \"$2\": $out"
    fi
}

expect duplicate-column 'entity "order": duplicate column "id"'
expect unknown-entity 'unknown entity "customer" in "to"'
expect unknown-cardinality 'fromCard "many" is not allowed; use one of: 1, 0..1, 1..*, 0..*'
expect unknown-kind 'kind "weak" is not allowed; use one of: owned, referenced'
expect unknown-column 'unknown column "b_id" in entity "a"'
expect seventeen-groups '17 groups, at most 16 are allowed'
expect seventeen-groups 'merge groups or split the diagram'
expect markup-field 'unknown field "style"'
expect markup-field 'unknown field "x"'
expect markup-in-text 'contains markup'
expect nullable-text 'entity "order", column "paid_at": nullable must be true or false'

# the complete example in references/model.md is a valid model
EX=$(mktemp "${TMPDIR:-/tmp}/erd-example.XXXXXX")
trap 'rm -f "$EX"' EXIT
awk '/^## Example/ {s=1} s && /^```json/ {j=1; next} j && /^```/ {exit} j {print}' \
    "$ROOT/skills/erd/references/model.md" > "$EX"
[ -s "$EX" ] || fail "skills/erd/references/model.md" "no json example found under \"## Example\""
out=$(python3 -I "$VALIDATOR" "$EX" 2>&1) || fail "skills/erd/references/model.md" "the example is not valid: $out"

# the default kind is documented as referenced
python3 -I - "$ROOT/skills/erd/scripts" <<'PY' || fail "skills/erd/scripts/erd_model.py" "DEFAULT_KIND is not referenced"
import sys
sys.path.insert(0, sys.argv[1])
import erd_model
sys.exit(0 if erd_model.DEFAULT_KIND == "referenced" and erd_model.validate({"title": "t"}) else 1)
PY

finish test-erd-model
