#!/usr/bin/env bash
# Documentation of capabilities and performance: `kpi.py doc --check` on the repository (the skills
# table and every Performance section match the adopted evaluations), the same check failing and
# naming the file on a temporary copy where a value was edited by hand or a block is missing, the
# adopted-evaluation rule (a baseline, pending or rework entry never counts), a derived skill validated
# on a sample page (documented as not measured, its anchor required), and the relative links of the READMEs.
set -u
. "$(dirname "$0")/lib.sh"
need python3

KPI="$ROOT/evals/kpi.py"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/artifacts-docs.XXXXXX")
trap 'rm -rf "$TMP"' EXIT

# the repository itself
out=$(python3 -I "$KPI" doc --check 2>&1) || fail "docs" "kpi.py doc --check failed: $out"

# a scratch repository holding only what the generator reads
copy_repo() { # copy_repo <dir>
    mkdir -p "$1/evals" "$1/skills"
    cp "$ROOT/README.md" "$1/README.md"
    for skill_dir in "$ROOT"/skills/*/; do
        skill=$(basename "$skill_dir")
        cp -R "$ROOT/skills/$skill" "$1/skills/$skill"
        [ -d "$ROOT/evals/$skill" ] && cp -R "$ROOT/evals/$skill" "$1/evals/$skill"
    done
}
check_in() { python3 -I "$KPI" doc --check --root "$1" 2>&1; }
# change the first percentage found after an optional marker, as a hand edit would
edit_first_pct() {
    python3 -I -c '
import re, sys
path, marker = sys.argv[1], sys.argv[2]
text = open(path).read()
start = text.index(marker) if marker else 0
m = re.compile(r"-?[0-9]+\.[0-9]%").search(text, start)
if not m:
    sys.exit("no percentage to edit in " + path)
edited = "0.0%" if m.group(0) != "0.0%" else "1.0%"
open(path, "w").write(text[:m.start()] + edited + text[m.end():])
' "$1" "${2:-}"
}

copy_repo "$TMP/ok"
check_in "$TMP/ok" >/dev/null || fail "docs:copy" "the untouched copy does not pass --check"

# a hand-edited Performance value
copy_repo "$TMP/edit"
edit_first_pct "$TMP/edit/skills/erd/README.md" '<!-- performance:start -->'
out=$(check_in "$TMP/edit"); rc=$?
[ "$rc" = 1 ] || fail "docs:edited-value" "exit status $rc, expected 1"
printf '%s' "$out" | grep -q '^skills/erd/README.md:' || fail "docs:edited-value" "the file is not named: $out"

# a hand-edited row of the skills table
copy_repo "$TMP/row"
edit_first_pct "$TMP/row/README.md" ""
out=$(check_in "$TMP/row"); rc=$?
[ "$rc" = 1 ] || fail "docs:edited-row" "exit status $rc, expected 1"
printf '%s' "$out" | grep -q '^README.md:' || fail "docs:edited-row" "the file is not named: $out"

# generating twice gives the same files
copy_repo "$TMP/gen"
python3 -I "$KPI" doc --root "$TMP/gen" >/dev/null 2>&1 || fail "docs:generate" "doc failed"
cp "$TMP/gen/README.md" "$TMP/g1.md"; cp "$TMP/gen/skills/erd/README.md" "$TMP/g1-erd.md"
python3 -I "$KPI" doc --root "$TMP/gen" >/dev/null 2>&1
cmp -s "$TMP/g1.md" "$TMP/gen/README.md" && cmp -s "$TMP/g1-erd.md" "$TMP/gen/skills/erd/README.md" \
    || fail "docs:determinism" "two runs give different files"
cmp -s "$ROOT/skills/erd/README.md" "$TMP/gen/skills/erd/README.md" || fail "docs:determinism" "the regenerated README differs from the committed one"

# missing markers: named, exit 2
copy_repo "$TMP/nomark"
grep -v 'performance:' "$TMP/nomark/skills/erd/README.md" > "$TMP/nomark/x" && mv "$TMP/nomark/x" "$TMP/nomark/skills/erd/README.md"
out=$(check_in "$TMP/nomark"); rc=$?
[ "$rc" = 2 ] || fail "docs:no-markers" "exit status $rc, expected 2"
printf '%s' "$out" | grep -q 'skills/erd/README.md' || fail "docs:no-markers" "the file is not named: $out"

# only an `adopt` decision counts: the newest adopted entry is used, a later pending one is ignored,
# and with none adopted the skill has no row and no Performance section is required
copy_repo "$TMP/pending"
printf '\n## 2026-12-01: evaluation\n\nDecision: pending\n\nDeliverables: `evals/results/2026-12-01T00-00-00Z/` (ignored)\n' >> "$TMP/pending/evals/erd/RESULTS.md"
check_in "$TMP/pending" >/dev/null || fail "docs:pending" "a later pending entry changed the adopted evaluation"
copy_repo "$TMP/none"
sed 's/^Decision: adopt.*/Decision: rework (more cases)/' "$TMP/none/evals/erd/RESULTS.md" > "$TMP/none/x" && mv "$TMP/none/x" "$TMP/none/evals/erd/RESULTS.md"
out=$(check_in "$TMP/none"); rc=$?
[ "$rc" = 1 ] || fail "docs:no-adopted" "exit status $rc, expected 1 (the skills table must lose the row)"
printf '%s' "$out" | grep -q '^README.md:' || fail "docs:no-adopted" "the skills table is not reported stale: $out"

# a derived skill validated on a sample page, not measured (design decision 3 of add-derived-skill-path)
add_derived() { # add_derived <dir> [anchor]: a scratch skill with a validation entry and a README with its markers
    local dir=$1 anchor=${2:-uml-class-diagram}
    mkdir -p "$dir/skills/uml-object-diagram" "$dir/evals/uml-object-diagram/sample"
    printf '%s\n' '---' 'summary: UML object diagram of instances and links, drawn like the class diagram' '---' '' \
        '# uml-object-diagram' '' '<!-- performance:start -->' '<!-- performance:end -->' > "$dir/skills/uml-object-diagram/README.md"
    cat > "$dir/evals/uml-object-diagram/RESULTS.md" <<RESULTS
# Evaluation results: uml-object-diagram

## 2026-11-20: validation

- Plugin version: 0.5.0
- Anchor: \`$anchor\`
- Sample: \`evals/uml-object-diagram/sample/library.object.uml.json\`
- Rendered with: default and alt themes, light and dark

Decision: adopt (validated, not measured; derived from $anchor) (2026-11-20). Reads like the class diagram.
RESULTS
}

copy_repo "$TMP/derived"
add_derived "$TMP/derived"
out=$(check_in "$TMP/derived"); rc=$?
[ "$rc" = 1 ] || fail "docs:derived-stale" "exit status $rc, expected 1 before the section is generated"
printf '%s' "$out" | grep -q '^skills/uml-object-diagram/README.md:' || fail "docs:derived-stale" "the README is not named: $out"
printf '%s' "$out" | grep -q '^README.md:' || fail "docs:derived-stale" "the skills table is not reported stale: $out"
python3 -I "$KPI" doc --root "$TMP/derived" >/dev/null 2>&1 || fail "docs:derived-generate" "doc failed on a validated derived skill"
check_in "$TMP/derived" >/dev/null || fail "docs:derived-check" "--check fails right after generating"
perf="$TMP/derived/skills/uml-object-diagram/README.md"
grep -q '^## Performance$' "$perf" || fail "docs:derived-section" "no Performance heading"
grep -q '^Not measured\. This skill is derived from \[`uml-class-diagram`\](\.\./uml-class-diagram/README\.md)' "$perf" \
    || fail "docs:derived-section" "the not-measured paragraph does not link the anchor"
grep -q 'validated a sample page on 2026-11-20 (plugin 0\.5\.0)' "$perf" || fail "docs:derived-section" "the validation date and plugin version are missing"
grep -q '\*\*Decision:\*\* adopt (validated, not measured)' "$perf" || fail "docs:derived-section" "the decision is missing"
row=$(grep '^| \[`uml-object-diagram`\]' "$TMP/derived/README.md")
[ "$row" = '| [`uml-object-diagram`](skills/uml-object-diagram/README.md) | UML object diagram of instances and links, drawn like the class diagram | not measured | not measured | 2026-11-20, derived from [`uml-class-diagram`](skills/uml-class-diagram/README.md) |' ] \
    || fail "docs:derived-row" "unexpected row: $row"
[ "$(grep -c '^| \[`erd`\]' "$TMP/derived/README.md")" = 1 ] || fail "docs:derived-row" "the measured rows are lost"
# the measured path is unchanged by the derived entry
cmp -s "$ROOT/skills/erd/README.md" "$TMP/derived/skills/erd/README.md" || fail "docs:derived-measured" "the erd README changed"
cmp -s "$ROOT/skills/uml-class-diagram/README.md" "$TMP/derived/skills/uml-class-diagram/README.md" || fail "docs:derived-measured" "the class diagram README changed"
# a hand-edited derived row fails and names README.md
sed 's/2026-11-20, derived from/2026-11-21, derived from/' "$TMP/derived/README.md" > "$TMP/derived/x" && mv "$TMP/derived/x" "$TMP/derived/README.md"
out=$(check_in "$TMP/derived"); rc=$?
[ "$rc" = 1 ] || fail "docs:derived-edited-row" "exit status $rc, expected 1"
printf '%s' "$out" | grep -q '^README.md:' || fail "docs:derived-edited-row" "the file is not named: $out"
# a hand-edited derived Performance section fails and names the skill README
python3 -I "$KPI" doc --root "$TMP/derived" >/dev/null 2>&1
sed 's/^Not measured\./Measured./' "$perf" > "$TMP/derived/x" && mv "$TMP/derived/x" "$perf"
out=$(check_in "$TMP/derived"); rc=$?
[ "$rc" = 1 ] || fail "docs:derived-edited-section" "exit status $rc, expected 1"
printf '%s' "$out" | grep -q '^skills/uml-object-diagram/README.md:' || fail "docs:derived-edited-section" "the file is not named: $out"
# the generator is deterministic on a derived skill
python3 -I "$KPI" doc --root "$TMP/derived" >/dev/null 2>&1; cp "$perf" "$TMP/d1.md"
python3 -I "$KPI" doc --root "$TMP/derived" >/dev/null 2>&1
cmp -s "$TMP/d1.md" "$perf" || fail "docs:derived-determinism" "two runs give different files"

# a validation whose anchor is unknown or has no adopted entry, or names no anchor: exit 2, the RESULTS.md named
copy_repo "$TMP/dv-unknown"
add_derived "$TMP/dv-unknown" no-such-skill
out=$(check_in "$TMP/dv-unknown"); rc=$?
[ "$rc" = 2 ] || fail "docs:anchor-unknown" "exit status $rc, expected 2"
printf '%s' "$out" | grep -q 'evals/uml-object-diagram/RESULTS.md' || fail "docs:anchor-unknown" "the file is not named: $out"
printf '%s' "$out" | grep -qi 'anchor' || fail "docs:anchor-unknown" "the message does not mention the anchor: $out"
copy_repo "$TMP/dv-unadopted"
add_derived "$TMP/dv-unadopted" erd
sed 's/^Decision: adopt.*/Decision: rework (more cases)/' "$TMP/dv-unadopted/evals/erd/RESULTS.md" > "$TMP/dv-unadopted/x" \
    && mv "$TMP/dv-unadopted/x" "$TMP/dv-unadopted/evals/erd/RESULTS.md"
out=$(check_in "$TMP/dv-unadopted"); rc=$?
[ "$rc" = 2 ] || fail "docs:anchor-unadopted" "exit status $rc, expected 2"
printf '%s' "$out" | grep -q 'evals/uml-object-diagram/RESULTS.md' || fail "docs:anchor-unadopted" "the file is not named: $out"
printf '%s' "$out" | grep -qi 'anchor' || fail "docs:anchor-unadopted" "the message does not mention the anchor: $out"
copy_repo "$TMP/dv-missing"
add_derived "$TMP/dv-missing"
grep -v '^- Anchor:' "$TMP/dv-missing/evals/uml-object-diagram/RESULTS.md" > "$TMP/dv-missing/x" \
    && mv "$TMP/dv-missing/x" "$TMP/dv-missing/evals/uml-object-diagram/RESULTS.md"
out=$(check_in "$TMP/dv-missing"); rc=$?
[ "$rc" = 2 ] || fail "docs:anchor-missing" "exit status $rc, expected 2"
printf '%s' "$out" | grep -q 'evals/uml-object-diagram/RESULTS.md' || fail "docs:anchor-missing" "the file is not named: $out"
printf '%s' "$out" | grep -qi 'anchor' || fail "docs:anchor-missing" "the message does not mention the anchor: $out"

# the summary data holds no absolute path or user name
for f in "$ROOT"/evals/*/runs/*.json; do
    [ -f "$f" ] || continue
    if grep -nE '/Users/|/home/|/private/|/tmp/|/var/' "$f" >/dev/null; then
        fail "${f#"$ROOT"/}" "holds an absolute path"
    fi
done

# relative links of the READMEs resolve
for readme in "$ROOT/README.md" "$ROOT"/skills/*/README.md; do
    [ -f "$readme" ] || continue
    dir=$(dirname "$readme")
    grep -oE '\]\([^)[:space:]]+\)' "$readme" | sed 's/^](//; s/)$//' | while IFS= read -r link; do
        case "$link" in http://*|https://*|mailto:*|\#*) continue ;; esac
        target="${link%%#*}"
        [ -e "$dir/$target" ] || printf '%s: the link "%s" does not resolve\n' "${readme#"$ROOT"/}" "$link"
    done
done > "$TMP/links.out"
if [ -s "$TMP/links.out" ]; then
    while IFS= read -r line; do fail "${line%%: *}" "${line#*: }"; done < "$TMP/links.out"
fi

finish test-docs
