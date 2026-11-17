#!/usr/bin/env bash
# Documentation of capabilities and performance: `kpi.py doc --check` on the repository (the skills
# table and every Performance section match the adopted evaluations), the same check failing and
# naming the file on a temporary copy where a value was edited by hand or a block is missing, the
# adopted-evaluation rule (a baseline, pending or rework entry never counts), and the relative links
# of the READMEs.
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
    cp -R "$ROOT/skills/erd" "$1/skills/erd"
    cp -R "$ROOT/evals/erd" "$1/evals/erd"
}
check_in() { python3 -I "$KPI" doc --check --root "$1" 2>&1; }

copy_repo "$TMP/ok"
check_in "$TMP/ok" >/dev/null || fail "docs:copy" "the untouched copy does not pass --check"

# a hand-edited Performance value
copy_repo "$TMP/edit"
sed 's/683,542/683,543/' "$TMP/edit/skills/erd/README.md" > "$TMP/edit/x" && mv "$TMP/edit/x" "$TMP/edit/skills/erd/README.md"
out=$(check_in "$TMP/edit"); rc=$?
[ "$rc" = 1 ] || fail "docs:edited-value" "exit status $rc, expected 1"
printf '%s' "$out" | grep -q '^skills/erd/README.md:' || fail "docs:edited-value" "the file is not named: $out"

# a hand-edited row of the skills table
copy_repo "$TMP/row"
sed 's/-88\.7%/-80.7%/' "$TMP/row/README.md" > "$TMP/row/x" && mv "$TMP/row/x" "$TMP/row/README.md"
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
