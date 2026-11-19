#!/usr/bin/env bash
# UML package diagram model validation: every valid fixture passes, every invalid fixture fails with
# its message, and the complete example in references/model.md is a valid model.
set -u
. "$(dirname "$0")/lib.sh"
need python3

SKILL="$ROOT/skills/uml-package-diagram"
VALIDATOR="$SKILL/scripts/uml_package_diagram_model.py"
FIX="$ROOT/tests/fixtures/uml-package-diagram"

for f in "$FIX"/valid/*.package.uml.json; do
    out=$(python3 -I "$VALIDATOR" "$f" 2>&1) || fail "${f#"$ROOT"/}" "valid fixture rejected: $out"
done

expect() { # expect <fixture name> <expected message substring>
    local f="$FIX/invalid/$1.package.uml.json" out
    [ -f "$f" ] || { fail "tests/fixtures/uml-package-diagram/invalid/$1.package.uml.json" "missing fixture"; return; }
    out=$(python3 -I "$VALIDATOR" "$f" 2>&1)
    if [ $? -eq 0 ]; then
        fail "${f#"$ROOT"/}" "invalid fixture accepted"
    elif ! printf '%s' "$out" | grep -qF -- "$2"; then
        fail "${f#"$ROOT"/}" "message lacks \"$2\": $out"
    fi
}

expect nesting-cycle 'nesting cycle a -> b -> a'
expect unknown-parent 'package "a": unknown parent "ghost"'
expect seventeen-packages '17 packages, at most 16 are allowed'
expect seventeen-packages 'merge packages or split the diagram'
expect unknown-dependency-kind 'kind "include" is not allowed; use one of: import, access, merge, dependency'
expect dependency-on-containing-package 'dependencies[0] (domain.ordering -> domain): a package cannot depend on a package that contains it'
expect self-dependency 'a package cannot depend on itself'
expect duplicate-member 'package "a": duplicate member "Order"'
expect position-field 'package "a": unknown field "x"'
expect position-field 'package "a": unknown field "y"'
expect position-field 'package "a": unknown field "position"'
expect position-field 'package "a": unknown field "style"'

# the fixtures that the renderer checks rely on: nesting three levels deep, every kind, seven packages, a package that holds packages and has members
python3 -I - "$FIX/valid" <<'PY' || fail "tests/fixtures/uml-package-diagram/valid" "a fixture the renderer checks rely on lacks its feature (three levels, every dependency kind, seven packages, stereotypes and members, a container with members)"
import json, os, sys
d = sys.argv[1]
load = lambda n: json.load(open(os.path.join(d, n + ".package.uml.json")))
def depth(p, parents):
    n = 1
    while parents.get(p):
        p = parents[p]; n += 1
    return n
n = load("nested-three-levels")
parents = {p["id"]: p.get("parent") for p in n["packages"]}
ok = max(depth(p, parents) for p in parents) == 3
k = {x["kind"] for x in load("every-dependency-kind")["dependencies"]}
ok = ok and k == {"import", "access", "merge", "dependency"}
ok = ok and len(load("seven-packages")["packages"]) == 7
s = load("stereotypes-and-members")["packages"]
ok = ok and any(p.get("stereotypes") for p in s) and any(p.get("members") for p in s)
c = load("containers-with-members")["packages"]
holders = {p.get("parent") for p in c}
ok = ok and any(p["id"] in holders and p.get("members") for p in c)
sys.exit(0 if ok else 1)
PY

# the complete example in references/model.md is a valid model
EX=$(mktemp "${TMPDIR:-/tmp}/uml-package-example.XXXXXX")
trap 'rm -f "$EX"' EXIT
awk '/^## Example/ {s=1} s && /^```json/ {j=1; next} j && /^```/ {exit} j {print}' \
    "$SKILL/references/model.md" > "$EX"
[ -s "$EX" ] || fail "skills/uml-package-diagram/references/model.md" "no json example found under \"## Example\""
out=$(python3 -I "$VALIDATOR" "$EX" 2>&1) || fail "skills/uml-package-diagram/references/model.md" "the example is not valid: $out"

finish test-uml-package-diagram-model
