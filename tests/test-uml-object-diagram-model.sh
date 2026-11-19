#!/usr/bin/env bash
# UML object diagram model validation: every valid fixture passes, every invalid fixture fails with
# its message, and the complete example in references/model.md is a valid model.
set -u
. "$(dirname "$0")/lib.sh"
need python3

SKILL="$ROOT/skills/uml-object-diagram"
VALIDATOR="$SKILL/scripts/uml_object_diagram_model.py"
FIX="$ROOT/tests/fixtures/uml-object-diagram"

for f in "$FIX"/valid/*.object.uml.json; do
    out=$(python3 -I "$VALIDATOR" "$f" 2>&1) || fail "${f#"$ROOT"/}" "valid fixture rejected: $out"
done

expect() { # expect <fixture name> <expected message substring>
    local f="$FIX/invalid/$1.object.uml.json" out
    [ -f "$f" ] || { fail "tests/fixtures/uml-object-diagram/invalid/$1.object.uml.json" "missing fixture"; return; }
    out=$(python3 -I "$VALIDATOR" "$f" 2>&1)
    if [ $? -eq 0 ]; then
        fail "${f#"$ROOT"/}" "invalid fixture accepted"
    elif ! printf '%s' "$out" | grep -qF -- "$2"; then
        fail "${f#"$ROOT"/}" "message lacks \"$2\": $out"
    fi
}

expect duplicate-id 'duplicate object id "loan1"'
expect unknown-object-in-link 'links[0] (a -> ghost): unknown object "ghost" in "to"'
expect literal-with-slots 'object "s": an enumeration literal has no slots'
expect duplicate-slot 'object "a": duplicate slot "due"'
expect link-multiplicity 'a link joins exactly two instances'
expect seventeen-packages '17 packages, at most 16 are allowed'
expect seventeen-packages 'merge packages or split the diagram'
expect position-field 'object "a": unknown field "x"'
expect position-field 'object "a": unknown field "y"'
expect position-field 'object "a": unknown field "position"'
expect position-field 'object "a": unknown field "style"'

# the fixtures that the renderer checks rely on
python3 -I - "$FIX/valid" <<'PY' || fail "tests/fixtures/uml-object-diagram/valid" "a fixture the renderer checks rely on lacks its feature (anonymous, literal, outside object, self link, no packages)"
import json, sys, os
d = sys.argv[1]
load = lambda n: json.load(open(os.path.join(d, n + ".object.uml.json")))
a = load("anonymous-and-literal"); o = a["objects"]
ok = any("name" not in x and "literal" not in x for x in o) and any("literal" in x for x in o)
p = load("packages-with-outsider")
ok = ok and p["packages"] and any("package" not in x for x in p["objects"])
s = load("self-link")
ok = ok and any(l["from"] == l["to"] for l in s["links"])
n = load("no-packages")
ok = ok and "packages" not in n
sys.exit(0 if ok else 1)
PY

# the complete example in references/model.md is a valid model
EX=$(mktemp "${TMPDIR:-/tmp}/uml-object-example.XXXXXX")
trap 'rm -f "$EX"' EXIT
awk '/^## Example/ {s=1} s && /^```json/ {j=1; next} j && /^```/ {exit} j {print}' \
    "$SKILL/references/model.md" > "$EX"
[ -s "$EX" ] || fail "skills/uml-object-diagram/references/model.md" "no json example found under \"## Example\""
out=$(python3 -I "$VALIDATOR" "$EX" 2>&1) || fail "skills/uml-object-diagram/references/model.md" "the example is not valid: $out"

finish test-uml-object-diagram-model
