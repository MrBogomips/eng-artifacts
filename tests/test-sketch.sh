#!/usr/bin/env bash
# evals/sketch.sh and evals/sketch.py: argument handling without starting claude, and the sketch
# report on committed fixtures (delivered and skill-free, missing deliverable, Skill call, same
# records twice give the same report).
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
mkdir -p "$TMP/cases/easy" "$TMP/cases/medium"
: >"$TMP/cases/easy/prompt.md"; : >"$TMP/cases/medium/prompt.md"
refuses no-argument "<cases-dir>"
refuses unknown-option "unknown option --nope" "$TMP/cases" --nope
refuses missing-folder "does not exist" "$TMP/nowhere"
refuses missing-case 'the case "complex" is missing' "$TMP/cases"
bash "$SKETCH" --help 2>&1 | grep -q 'sketch.sh <cases-dir>' || fail "sketch.sh:help" "no usage text"
after=$(find "$ROOT/evals/results" -maxdepth 1 -name 'sketch-*' 2>/dev/null | wc -l)
[ "$before" = "$after" ] || fail "sketch.sh" "a refusal left a run folder behind"

# --- sketch.py on fixtures
scenario() { # scenario <name> <expected exit>
    local name="$1" want="$2" d="$TMP/$1" rc
    cp -R "$FIX/$name" "$d"
    python3 -I "$REPORT" --run-dir "$d" >"$TMP/$name.out" 2>&1
    rc=$?
    [ "$rc" = "$want" ] || fail "sketch.py:$name" "exit status $rc, expected $want"
}

scenario good 0
scenario missing 1
scenario skill-called 1

jq -e '.ok == true and (.cases | map(.case) == ["easy","medium","complex"]) and (.cases | all(.exists and .skillFree and .complete))' \
    "$TMP/good/report.json" >/dev/null || fail "sketch.py:good" "the report does not show three delivered, skill-free sketches"
jq -e '.cases[0].tokens == 20000 and .cases[0].timeMs == 30000 and .cases[0].costUsd == 0.2 and .totalCostUsd == 1.4' \
    "$TMP/good/report.json" >/dev/null || fail "sketch.py:good" "tokens, time or cost are not the recorded figures"
grep -q 'Total cost: 1.4000 USD' "$TMP/good/report.md" || fail "sketch.py:good" "the markdown report lacks the total cost"

jq -e '.ok == false and .cases[1].exists == false and .cases[0].exists == true' "$TMP/missing/report.json" >/dev/null \
    || fail "sketch.py:missing" "the medium sketch is not reported as missing alone"
grep -q '| medium | `[^`]*medium.html` | NO |' "$TMP/missing/report.md" || fail "sketch.py:missing" "the markdown report does not show the missing deliverable"

jq -e '.ok == false and .cases[2].skillFree == false and .cases[0].skillFree == true and .cases[1].skillFree == true' \
    "$TMP/skill-called/report.json" >/dev/null || fail "sketch.py:skill-called" "the Skill call of the complex session is not flagged alone"
grep -q '| complex | .* | yes | NO |' "$TMP/skill-called/report.md" || fail "sketch.py:skill-called" "the markdown report does not flag the Skill call"

# no absolute path in a report
if grep -nE '/Users/|/private/|/home/|/tmp/|/var/' "$TMP/good/report.json" "$TMP/good/report.md" >/dev/null; then
    fail "sketch.py:good" "the report holds an absolute path"
fi

# same records, same report
cp "$TMP/good/report.json" "$TMP/r1.json"; cp "$TMP/good/report.md" "$TMP/r1.md"
python3 -I "$REPORT" --run-dir "$TMP/good" >/dev/null 2>&1
cmp -s "$TMP/r1.json" "$TMP/good/report.json" || fail "sketch.py:determinism" "report.json differs between two computations"
cmp -s "$TMP/r1.md" "$TMP/good/report.md" || fail "sketch.py:determinism" "report.md differs between two computations"

# a trace missing a field stops the tool and names it
rm -rf "$TMP/broken"; cp -R "$FIX/good" "$TMP/broken"
python3 - "$TMP/broken/sketch-easy/with-1/trace.jsonl" <<'PY'
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
