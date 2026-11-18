#!/usr/bin/env bash
# UML class diagram model validation: every valid fixture passes, every invalid fixture fails with
# its message, and the complete example in references/model.md is a valid model.
set -u
. "$(dirname "$0")/lib.sh"
need python3

SKILL="$ROOT/skills/uml-class-diagram"
VALIDATOR="$SKILL/scripts/uml_class_diagram_model.py"
FIX="$ROOT/tests/fixtures/uml-class-diagram"

for f in "$FIX"/valid/*.uml.json; do
    out=$(python3 -I "$VALIDATOR" "$f" 2>&1) || fail "${f#"$ROOT"/}" "valid fixture rejected: $out"
done

expect() { # expect <fixture name> <expected message substring>
    local f="$FIX/invalid/$1.uml.json" out
    [ -f "$f" ] || { fail "tests/fixtures/uml-class-diagram/invalid/$1.uml.json" "missing fixture"; return; }
    out=$(python3 -I "$VALIDATOR" "$f" 2>&1)
    if [ $? -eq 0 ]; then
        fail "${f#"$ROOT"/}" "invalid fixture accepted"
    elif ! printf '%s' "$out" | grep -qF -- "$2"; then
        fail "${f#"$ROOT"/}" "message lacks \"$2\": $out"
    fi
}

expect duplicate-classifier 'duplicate classifier name "Order"'
expect unknown-kind 'classifier "Order": kind "record" is not allowed; use one of: class, interface, enumeration'
expect unknown-visibility 'classifier "Order", attribute "id": visibility "internal" is not allowed; use one of: public, protected, private, package'
expect abstract-operation-in-concrete-class 'classifier "Order", operation "confirm": the operation is abstract but the class is not'
expect unknown-classifier 'relationships[0] (A -> Missing): unknown classifier "Missing" in "to"'
expect realization-of-class 'relationships[0] (A -> B): a realization must point to an interface'
expect generalization-cycle 'generalization cycle A -> B -> A'
expect bad-multiplicity 'relationships[0] (A -> B): toEnd multiplicity "3..1" is not allowed; use n, n..m, n..* or *'
expect seventeen-packages '17 packages, at most 16 are allowed'
expect seventeen-packages 'merge packages or split the diagram'
expect position-field 'classifier "Order": unknown field "x"'
expect position-field 'classifier "Order": unknown field "y"'
expect position-field 'classifier "Order": unknown field "style"'
expect markup-in-text 'contains markup'
expect enumeration-without-literals 'classifier "Status": an enumeration needs at least one literal'
expect enumeration-with-operation 'classifier "Status": an enumeration has no operations'
expect end-without-multiplicity 'toEnd needs a multiplicity'
expect end-on-dependency 'toEnd is allowed only on composition, aggregation, association'
expect binding-unknown-parameter 'bindings name "X", which is not a type parameter of "Repo" (it has: T)'
expect unknown-package 'classifier "Order": unknown package "nowhere"'
expect duplicate-attribute 'classifier "Order": duplicate attribute "id"'

# the ticketing fixture is the big case: 26 classifiers, four packages, every relationship kind
python3 -I - "$FIX/valid/ticketing.uml.json" <<'PY' || fail "tests/fixtures/uml-class-diagram/valid/ticketing.uml.json" "is not the 26-classifier, four-package, six-kind fixture the renderer checks rely on"
import json, sys
m = json.load(open(sys.argv[1]))
kinds = {r["kind"] for r in m["relationships"]}
sys.exit(0 if len(m["classifiers"]) == 26 and len(m["packages"]) == 4 and len(kinds) == 6 else 1)
PY

# the complete example in references/model.md is a valid model
EX=$(mktemp "${TMPDIR:-/tmp}/uml-example.XXXXXX")
trap 'rm -f "$EX"' EXIT
awk '/^## Example/ {s=1} s && /^```json/ {j=1; next} j && /^```/ {exit} j {print}' \
    "$SKILL/references/model.md" > "$EX"
[ -s "$EX" ] || fail "skills/uml-class-diagram/references/model.md" "no json example found under \"## Example\""
out=$(python3 -I "$VALIDATOR" "$EX" 2>&1) || fail "skills/uml-class-diagram/references/model.md" "the example is not valid: $out"

finish test-uml-class-diagram-model
