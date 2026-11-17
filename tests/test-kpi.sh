#!/usr/bin/env bash
# evals/kpi.py on committed fixtures: classification and exit status per scenario, byte-identical
# reports on a second computation, a sanitized RESULTS entry, a named missing trace field, and the
# collection of a kept (sealed) temporary folder.
set -u
. "$(dirname "$0")/lib.sh"
need jq
need python3

KPI="$ROOT/evals/kpi.py"
FIX="$ROOT/tests/fixtures/eval"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/artifacts-kpi.XXXXXX")
trap 'chmod -R u+rwx "$TMP" 2>/dev/null; rm -rf "$TMP"' EXIT

scenario() { # scenario <name> <expected label> <expected exit>
    local name="$1" want="$2" rc_want="$3" d="$TMP/$1" rc label
    cp -R "$FIX/$name" "$d"
    python3 -I "$KPI" --skill fx --run-dir "$d" --no-record >"$TMP/$name.out" 2>&1
    rc=$?
    [ "$rc" = "$rc_want" ] || fail "kpi:$name" "exit status $rc, expected $rc_want"
    label=$(jq -r '.classification.label' "$d/report.json" 2>/dev/null)
    [ "$label" = "$want" ] || fail "kpi:$name" "classification \"$label\", expected \"$want\""
}

scenario meets-target "meets target" 0
scenario below-time "below target" 0
scenario regress "below target" 0
scenario skill-not-used "below target" 0
scenario no-benefit "no benefit" 0
scenario incomplete "incomplete" 1

# what each non-passing scenario must name
jq -e '.classification.unmetTargets == ["time"]' "$TMP/below-time/report.json" >/dev/null || fail "kpi:below-time" "unmet target is not [time]"
jq -e '.classification.worseCases | map(.case) == ["easy"]' "$TMP/regress/report.json" >/dev/null || fail "kpi:regress" "worse case is not easy"
jq -e '.classification.flaggedRuns[0].run == "easy/with-2" and .classification.flaggedRuns[0].why == "skill not used"' "$TMP/skill-not-used/report.json" >/dev/null \
    || fail "kpi:skill-not-used" "the run without the skill is not flagged"
jq -e '.classification.incompleteRuns == ["hard/with-3"]' "$TMP/incomplete/report.json" >/dev/null || fail "kpi:incomplete" "incomplete run not named"
jq -e '.totals.reduction.tokens == 40 and .totals.reduction.timeMs == 40' "$TMP/meets-target/report.json" >/dev/null || fail "kpi:meets-target" "reductions are not 40%/40%"

# a trace missing a field stops the tool and names the field
rm -rf "$TMP/missing"; cp -R "$FIX/missing-field" "$TMP/missing"
out=$(python3 -I "$KPI" --skill fx --run-dir "$TMP/missing" --no-record 2>&1); rc=$?
[ "$rc" = 2 ] || fail "kpi:missing-field" "exit status $rc, expected 2"
printf '%s' "$out" | grep -qF 'modelUsage.model-a.cacheReadInputTokens' || fail "kpi:missing-field" "message does not name the field: $out"
[ ! -e "$TMP/missing/report.json" ] || fail "kpi:missing-field" "a report was written"

# same recorded runs, same report
python3 -I "$KPI" --skill fx --run-dir "$TMP/meets-target" --no-record >/dev/null 2>&1
cp "$TMP/meets-target/report.json" "$TMP/r1.json"; cp "$TMP/meets-target/report.md" "$TMP/r1.md"
python3 -I "$KPI" --skill fx --run-dir "$TMP/meets-target" --no-record >/dev/null 2>&1
cmp -s "$TMP/r1.json" "$TMP/meets-target/report.json" || fail "kpi:determinism" "report.json differs between two computations"
cmp -s "$TMP/r1.md" "$TMP/meets-target/report.md" || fail "kpi:determinism" "report.md differs between two computations"

# a stricter target is honored, a looser one refused
python3 -I "$KPI" --skill fx --run-dir "$TMP/meets-target" --no-record --target-tokens 50 >/dev/null 2>&1
jq -e '.classification.label == "below target" and .classification.unmetTargets == ["tokens"]' "$TMP/meets-target/report.json" >/dev/null \
    || fail "kpi:targets" "a 50% token target was not applied"
python3 -I "$KPI" --skill fx --run-dir "$TMP/meets-target" --no-record --target-time 10 >/dev/null 2>&1
[ $? = 2 ] || fail "kpi:targets" "a looser target was accepted"

# RESULTS entry: sanitized, with an empty decision
RES="$TMP/RESULTS.md"
python3 -I "$KPI" --skill fx --run-dir "$TMP/meets-target" --results-file "$RES" --date 2026-01-02 >/dev/null 2>&1
grep -q '^Decision: pending$' "$RES" || fail "kpi:results" "no pending decision line"
grep -q '^## 2026-01-02' "$RES" || fail "kpi:results" "no dated entry"
if grep -nE '/Users/|/private/|/home/|/tmp/|/var/' "$RES" >/dev/null; then
    fail "kpi:results" "RESULTS entry holds an absolute path: $(grep -nE '/Users/|/private/|/home/|/tmp/|/var/' "$RES" | head -1)"
fi

# the sanitized summary written beside RESULTS.md: figures only, no path, deterministic
SUM="$TMP/runs/meets-target.json"
[ -f "$SUM" ] || fail "kpi:summary" "no runs/<run-id>.json written beside RESULTS.md"
jq -e '.skill == "fx" and .date == "2026-01-02" and .runId == "meets-target" and .totals.reduction.tokens == 40 and (.cases | length) > 0' "$SUM" >/dev/null 2>&1 \
    || fail "kpi:summary" "the summary lacks its identity or totals"
if grep -nE '/Users/|/private/|/home/|/tmp/|/var/' "$SUM" >/dev/null; then
    fail "kpi:summary" "the summary holds an absolute path"
fi
cp "$SUM" "$TMP/s1.json"
python3 -I "$KPI" --skill fx --run-dir "$TMP/meets-target" --results-file "$TMP/RESULTS2.md" --date 2026-01-02 >/dev/null 2>&1
cmp -s "$TMP/s1.json" "$TMP/runs/meets-target.json" || fail "kpi:summary" "the summary differs between two computations"
[ ! -e "$TMP/meets-target/runs" ] || fail "kpi:summary" "a summary was written inside the run folder"

# collection of a kept, sealed temporary folder: copy, then delete
K="$TMP/e-fake"; RUN="$TMP/collect"
mkdir -p "$K/out" "$K/config/projects/p" "$K/sealed/home/cwd/.claude" "$RUN"
cp "$FIX/meets-target/easy/with-1/trace.jsonl" "$K/out/trace.jsonl"
printf '{"type":"assistant","effort":"medium"}\n' > "$K/config/projects/p/s.jsonl"
printf '<html>erd</html>\n' > "$K/sealed/home/cwd/erd.html"
chmod 000 "$K/sealed"; chmod 500 "$K"
jq --arg t "$K/out/trace.jsonl" '
  .cases |= map(select(.name == "easy"))
  | .cases[0].arms.with |= [.[0] | .tracePath = $t]
  | .cases[0].arms.with[0].graders |= map(select(.name != "skill"))
  | .cases[0].arms.without |= []' "$FIX/meets-target/aggregate.json" > "$RUN/aggregate.json"
python3 -I "$KPI" --skill fx --run-dir "$RUN" --no-record >/dev/null 2>&1
[ -f "$RUN/easy/with-1/deliverables/erd.html" ] || fail "kpi:collect" "deliverable not copied"
[ -f "$RUN/easy/with-1/trace.jsonl" ] || fail "kpi:collect" "trace not copied"
[ ! -e "$K" ] || fail "kpi:collect" "the kept temporary folder was not deleted"
jq -e '.effort == ["medium"]' "$RUN/easy/with-1/meta.json" >/dev/null 2>&1 || fail "kpi:collect" "observed effort not recorded"

finish test-kpi
