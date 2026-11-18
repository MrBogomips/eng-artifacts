#!/usr/bin/env bash
# evals/sketch.sh and evals/sketch.py: argument handling without starting claude, and the sketch
# report on committed fixtures (one complex case run three times: delivered and skill-free, missing
# deliverable, Skill call, fewer than three runs, same records twice give the same report).
set -u
. "$(dirname "$0")/lib.sh"
need jq
need python3

SKETCH="$ROOT/evals/sketch.sh"
REPORT="$ROOT/evals/sketch.py"
FIX="$ROOT/tests/fixtures/sketch"
TMP=$(mktemp -d "${TMPDIR:-/tmp}/artifacts-sketch.XXXXXX")
trap 'rm -rf "$TMP"' EXIT

# --- sketch.sh: every refusal exits 2 and names the problem, before anything runs
refuses() { # refuses <label> <expected text> <args...>
    local label="$1" want="$2" out rc
    shift 2
    out=$(bash "$SKETCH" "$@" 2>&1); rc=$?
    [ "$rc" = 2 ] || fail "sketch.sh:$label" "exit status $rc, expected 2"
    printf '%s' "$out" | grep -qF -- "$want" || fail "sketch.sh:$label" "output does not mention \"$want\""
}

before=$(find "$ROOT/evals/results" -maxdepth 1 -name 'sketch-*' 2>/dev/null | wc -l)
mkdir -p "$TMP/cases/easy" "$TMP/cases/medium" "$TMP/full/complex" "$TMP/full/easy" "$TMP/full/medium" "$TMP/only/complex"
: >"$TMP/cases/easy/prompt.md"; : >"$TMP/cases/medium/prompt.md"
: >"$TMP/full/complex/prompt.md"; : >"$TMP/full/easy/prompt.md"; : >"$TMP/full/medium/prompt.md"
: >"$TMP/only/complex/prompt.md"
refuses no-argument "<cases-dir>"
refuses unknown-option "unknown option --nope" "$TMP/cases" --nope
refuses missing-folder "does not exist" "$TMP/nowhere"
refuses missing-case 'the case "complex" is missing' "$TMP/cases"
bash "$SKETCH" --help 2>&1 | grep -q 'sketch.sh <cases-dir>' || fail "sketch.sh:help" "no usage text"

# the notice for the former three-case folder comes before the claude check: run with a PATH that has no claude
mkdir -p "$TMP/nobin"
BASH_BIN=$(command -v bash)
out=$(env PATH="$TMP/nobin" "$BASH_BIN" "$SKETCH" "$TMP/full" 2>&1); rc=$?
[ "$rc" = 2 ] || fail "sketch.sh:ignored-notice" "exit status $rc, expected 2 (claude is not on PATH)"
printf '%s' "$out" | grep -qF 'the case "easy" is ignored' || fail "sketch.sh:ignored-notice" "no notice that easy is ignored"
printf '%s' "$out" | grep -qF 'the case "medium" is ignored' || fail "sketch.sh:ignored-notice" "no notice that medium is ignored"
printf '%s' "$out" | grep -qF 'claude is not on PATH' || fail "sketch.sh:ignored-notice" "the run did not reach the claude check"
out=$(env PATH="$TMP/nobin" "$BASH_BIN" "$SKETCH" "$TMP/only" 2>&1); rc=$?
[ "$rc" = 2 ] || fail "sketch.sh:complex-only" "exit status $rc, expected 2 (claude is not on PATH)"
printf '%s' "$out" | grep -qF 'is ignored' && fail "sketch.sh:complex-only" "a notice for a folder holding only complex"
printf '%s' "$out" | grep -qF 'claude is not on PATH' || fail "sketch.sh:complex-only" "the run did not reach the claude check"

after=$(find "$ROOT/evals/results" -maxdepth 1 -name 'sketch-*' 2>/dev/null | wc -l)
[ "$before" = "$after" ] || fail "sketch.sh" "a refusal left a run folder behind"

# --- sketch.py on fixtures
scenario() { # scenario <name> <expected exit>
    local name="$1" want="$2" d="$TMP/$1" rc
    cp -R "$FIX/$name" "$d"
    python3 -I "$REPORT" --run-dir "$d" --effort xhigh >"$TMP/$name.out" 2>&1
    rc=$?
    [ "$rc" = "$want" ] || fail "sketch.py:$name" "exit status $rc, expected $want"
}

scenario good 0
scenario missing 1
scenario skill-called 1
scenario short 1

SHA=$(python3 -I -c 'import hashlib,sys; print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' \
    "$FIX/good/plugin/evals/complex/prompt.md")

# good: three rows run 1..3, per-run figures, total cost, one prompt fingerprint, model and effort
jq -e '.ok == true and (.runs | map(.run) == [1,2,3]) and (.runs | all(.exists and .skillFree and .complete))' \
    "$TMP/good/report.json" >/dev/null || fail "sketch.py:good" "the report does not show three delivered, skill-free runs"
jq -e '.runs[0].tokens == 20000 and .runs[0].timeMs == 30000 and .runs[0].costUsd == 0.2
    and .runs[1].tokens == 40000 and .runs[2].timeMs == 120000 and .runs[2].costUsd == 0.8
    and .totalCostUsd == 1.4' \
    "$TMP/good/report.json" >/dev/null || fail "sketch.py:good" "tokens, time or cost are not the recorded figures"
grep -q 'Total cost: 1.4000 USD' "$TMP/good/report.md" || fail "sketch.py:good" "the markdown report lacks the total cost"
for n in 1 2 3; do
    grep -q "^| run $n | " "$TMP/good/report.md" || fail "sketch.py:good" "the markdown report lacks the row run $n"
done
jq -e --arg sha "$SHA" '.promptSha256 == $sha' "$TMP/good/report.json" >/dev/null \
    || fail "sketch.py:good" "the JSON fingerprint is not the SHA-256 of the fixture prompt"
grep -qF "${SHA%"${SHA#????????????}"}" "$TMP/good/report.md" || fail "sketch.py:good" "the markdown report lacks the first 12 digits of the prompt fingerprint"
[ "$(grep -c "${SHA%"${SHA#????????????}"}" "$TMP/good/report.md")" = 1 ] || fail "sketch.py:good" "the prompt fingerprint is not stated once"
jq -e '.model == "fixture-model" and .effort == "xhigh"' "$TMP/good/report.json" >/dev/null \
    || fail "sketch.py:good" "the report does not state the model and the requested effort"
grep -q 'effort: xhigh' "$TMP/good/report.md" || fail "sketch.py:good" "the markdown report does not state the requested effort"
jq -e '.runs | all(.observedEffort == ["xhigh"])' "$TMP/good/report.json" >/dev/null \
    || fail "sketch.py:good" "the observed effort of each run is not reported"

# missing: run 2 alone has no deliverable; run 3 reports the effort it observed
jq -e '.ok == false and .runs[1].exists == false and .runs[0].exists == true and .runs[2].exists == true' "$TMP/missing/report.json" >/dev/null \
    || fail "sketch.py:missing" "run 2 is not reported as missing alone"
grep -q '^| run 2 | `[^`]*complex.html` | NO |' "$TMP/missing/report.md" || fail "sketch.py:missing" "the markdown report does not show the missing deliverable"
jq -e '.runs[2].observedEffort == ["high"] and .runs[0].observedEffort == ["xhigh"]' "$TMP/missing/report.json" >/dev/null \
    || fail "sketch.py:missing" "the observed effort is not reported per run"

# skill-called: run 3 alone is flagged
jq -e '.ok == false and .runs[2].skillFree == false and .runs[0].skillFree == true and .runs[1].skillFree == true' \
    "$TMP/skill-called/report.json" >/dev/null || fail "sketch.py:skill-called" "the Skill call of run 3 is not flagged alone"
grep -q '^| run 3 | .* | yes | NO |' "$TMP/skill-called/report.md" || fail "sketch.py:skill-called" "the markdown report does not flag the Skill call"

# short: two runs recorded, the third is reported missing and the report is not ok
jq -e '.ok == false and (.runs | length) == 3 and .runs[2].complete == false and .runs[2].exists == false
    and (.runs[2].problem | length) > 0 and .runs[0].complete and .runs[1].complete and .totalCostUsd == 0.6' \
    "$TMP/short/report.json" >/dev/null || fail "sketch.py:short" "the run that did not run is not reported alone"
grep -q '^- run 3: ' "$TMP/short/report.md" || fail "sketch.py:short" "the markdown report does not name the run that did not run"

# no absolute path in a report
if grep -nE '/Users/|/private/|/home/|/tmp/|/var/' "$TMP/good/report.json" "$TMP/good/report.md" >/dev/null; then
    fail "sketch.py:good" "the report holds an absolute path"
fi

# same records, same report
cp "$TMP/good/report.json" "$TMP/r1.json"; cp "$TMP/good/report.md" "$TMP/r1.md"
python3 -I "$REPORT" --run-dir "$TMP/good" --effort xhigh >/dev/null 2>&1
cmp -s "$TMP/r1.json" "$TMP/good/report.json" || fail "sketch.py:determinism" "report.json differs between two computations"
cmp -s "$TMP/r1.md" "$TMP/good/report.md" || fail "sketch.py:determinism" "report.md differs between two computations"

# a trace missing a field stops the tool and names it
rm -rf "$TMP/broken"; cp -R "$FIX/good" "$TMP/broken"
python3 - "$TMP/broken/sketch-complex/with-1/trace.jsonl" <<'PY'
import json, sys
path = sys.argv[1]
recs = [json.loads(l) for l in open(path)]
for r in recs:
    if r.get("type") == "result":
        del r["modelUsage"]["model-a"]["cacheReadInputTokens"]
open(path, "w").write("\n".join(json.dumps(r) for r in recs) + "\n")
PY
out=$(python3 -I "$REPORT" --run-dir "$TMP/broken" 2>&1); rc=$?
[ "$rc" = 2 ] || fail "sketch.py:broken" "exit status $rc, expected 2"
printf '%s' "$out" | grep -qF 'cacheReadInputTokens' || fail "sketch.py:broken" "message does not name the field"

finish test-sketch
